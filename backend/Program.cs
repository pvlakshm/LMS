using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var app = builder.Build();

var leaveState = new LeaveState();
var shellState = new ShellState(
    Navigation: ShellContract.Navigation,
    Roles: ShellContract.Roles
);

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/shell", () => Results.Ok(shellState));

app.MapGet("/api/employee/balance", (int employeeId = 1) =>
{
    var balance = leaveState.GetBalance(employeeId);
    return Results.Ok(new
    {
        baselineDays = LeavePolicy.BaselineAnnualLeaveDays,
        usedDays = balance.UsedDays,
        remainingDays = balance.RemainingDays
    });
});

app.MapGet("/api/employee/leave-requests", (int employeeId = 1) =>
    Results.Ok(leaveState.GetRequestsForEmployee(employeeId)));

app.MapPost("/api/employee/leave-requests", (LeaveRequestInput input) =>
{
    var employeeId = input.EmployeeId ?? 1;
    var submission = leaveState.TrySubmitLeaveRequest(input.StartDate, input.EndDate, employeeId);

    if (!submission.Success)
    {
        return Results.BadRequest(new { message = submission.Message });
    }

    return Results.Ok(new
    {
        message = submission.Message,
        request = submission.Request,
        remainingDays = submission.RemainingDays
    });
});

app.MapPost("/api/employee/leave-requests/{id:int}/cancel", (int id, int employeeId = 1) =>
{
    var cancellation = leaveState.TryCancelLeaveRequest(id, employeeId);

    if (!cancellation.Success && cancellation.Error == CancellationError.NotFound)
    {
        return Results.NotFound(new { message = cancellation.Message });
    }

    if (!cancellation.Success && cancellation.Error == CancellationError.Unauthorized)
    {
        return Results.Forbid();
    }

    if (!cancellation.Success && cancellation.Error == CancellationError.NotPending)
    {
        return Results.Conflict(new { message = cancellation.Message });
    }

    return Results.Ok(new
    {
        message = cancellation.Message,
        request = cancellation.Request
    });
});

app.MapGet("/api/manager/leave-requests", () => Results.Ok(leaveState.GetRequests()));

app.MapPost("/api/manager/leave-requests/{id:int}/approve", (int id) =>
{
    var approval = leaveState.TryApproveLeaveRequest(id);

    if (!approval.Success && approval.Error == ApprovalError.NotFound)
    {
        return Results.NotFound(new { message = approval.Message });
    }

    if (!approval.Success)
    {
        return Results.Conflict(new { message = approval.Message });
    }

    return Results.Ok(new
    {
        message = approval.Message,
        request = approval.Request
    });
});

app.Run();

public enum UserRole
{
    Employee,
    Manager
}

public enum LeaveRequestStatus
{
    Pending,
    Approved,
    Cancelled
}

public enum ApprovalError
{
    None,
    NotFound,
    AlreadyApproved,
    NotPending,
    InsufficientBalance
}

public enum CancellationError
{
    None,
    NotFound,
    NotPending,
    Unauthorized
}

public record ShellState(string[] Navigation, UserRole[] Roles);

public record LeaveRequestInput(DateOnly StartDate, DateOnly EndDate, int? EmployeeId = null);

public record LeaveRequestRecord(int Id, int EmployeeId, DateOnly StartDate, DateOnly EndDate, int Days, LeaveRequestStatus Status);

public record LeaveBalance(int UsedDays, int RemainingDays);

public record LeaveSubmissionResult(bool Success, string Message, LeaveRequestRecord? Request, int RemainingDays);

public record LeaveApprovalResult(bool Success, string Message, LeaveRequestRecord? Request, ApprovalError Error);

public record LeaveCancellationResult(bool Success, string Message, LeaveRequestRecord? Request, CancellationError Error);

public static class ShellContract
{
    public static readonly string[] Navigation = ["Dashboard", "My Leave Requests", "Team Leave Requests"];
    public static readonly UserRole[] Roles = [UserRole.Employee, UserRole.Manager];
}

public static class LeavePolicy
{
    public const int BaselineAnnualLeaveDays = 15;
}

public class LeaveState
{
    private readonly List<LeaveRequestRecord> _requests = [];
    private int _nextRequestId = 1;

    public LeaveBalance GetBalance(int employeeId)
    {
        var usedDays = _requests
            .Where(x => x.EmployeeId == employeeId && x.Status == LeaveRequestStatus.Approved)
            .Sum(x => x.Days);

        var remainingDays = LeavePolicy.BaselineAnnualLeaveDays - usedDays;
        return new LeaveBalance(usedDays, remainingDays);
    }

    public IReadOnlyList<LeaveRequestRecord> GetRequests()
    {
        return _requests
            .OrderBy(x => x.Id)
            .ToList();
    }

    public IReadOnlyList<LeaveRequestRecord> GetRequestsForEmployee(int employeeId)
    {
        return _requests
            .Where(x => x.EmployeeId == employeeId)
            .OrderBy(x => x.Id)
            .ToList();
    }

    public LeaveSubmissionResult TrySubmitLeaveRequest(DateOnly startDate, DateOnly endDate, int employeeId)
    {
        if (endDate < startDate)
        {
            return new LeaveSubmissionResult(false, "End date cannot be before start date.", null, GetBalance(employeeId).RemainingDays);
        }

        var requestedDays = endDate.DayNumber - startDate.DayNumber + 1;

        var request = new LeaveRequestRecord(
            Id: _nextRequestId++,
            EmployeeId: employeeId,
            StartDate: startDate,
            EndDate: endDate,
            Days: requestedDays,
            Status: LeaveRequestStatus.Pending
        );

        _requests.Add(request);

        var currentBalance = GetBalance(employeeId);

        return new LeaveSubmissionResult(true, "Leave request submitted successfully.", request, currentBalance.RemainingDays);
    }

    public LeaveApprovalResult TryApproveLeaveRequest(int requestId)
    {
        var index = _requests.FindIndex(x => x.Id == requestId);

        if (index < 0)
        {
            return new LeaveApprovalResult(false, $"Leave request {requestId} was not found.", null, ApprovalError.NotFound);
        }

        var current = _requests[index];

        if (current.Status == LeaveRequestStatus.Approved)
        {
            return new LeaveApprovalResult(
                false,
                $"Leave request {requestId} is already approved.",
                current,
                ApprovalError.AlreadyApproved
            );
        }

        if (current.Status != LeaveRequestStatus.Pending)
        {
            return new LeaveApprovalResult(
                false,
                $"Leave request {requestId} is not pending and cannot be approved.",
                current,
                ApprovalError.NotPending
            );
        }

        var balance = GetBalance(current.EmployeeId);
        if (current.Days > balance.RemainingDays)
        {
            return new LeaveApprovalResult(
                false,
                $"Cannot approve request {requestId}: requested {current.Days} day(s), but only {balance.RemainingDays} day(s) remain.",
                current,
                ApprovalError.InsufficientBalance
            );
        }

        var updated = current with { Status = LeaveRequestStatus.Approved };
        _requests[index] = updated;

        return new LeaveApprovalResult(true, "Leave request approved successfully.", updated, ApprovalError.None);
    }

    public LeaveCancellationResult TryCancelLeaveRequest(int requestId, int employeeId)
    {
        var index = _requests.FindIndex(x => x.Id == requestId);

        if (index < 0)
        {
            return new LeaveCancellationResult(false, $"Leave request {requestId} was not found.", null, CancellationError.NotFound);
        }

        var current = _requests[index];

        if (current.EmployeeId != employeeId)
        {
            return new LeaveCancellationResult(false, "You can cancel only your own leave requests.", current, CancellationError.Unauthorized);
        }

        if (current.Status != LeaveRequestStatus.Pending)
        {
            return new LeaveCancellationResult(
                false,
                $"Leave request {requestId} is not pending and cannot be cancelled.",
                current,
                CancellationError.NotPending
            );
        }

        var updated = current with { Status = LeaveRequestStatus.Cancelled };
        _requests[index] = updated;

        return new LeaveCancellationResult(true, "Leave request cancelled successfully.", updated, CancellationError.None);
    }
}

public partial class Program
{
}
