using System;
using Xunit;

namespace LMS.Tests;

public class LeaveApiTests
{
    [Fact]
    public void LeaveState_Uses15DaysBaseline()
    {
        var leaveState = new LeaveState();

        var balance = leaveState.GetBalance(1);

        Assert.Equal(0, balance.UsedDays);
        Assert.Equal(15, balance.RemainingDays);
    }

    [Fact]
    public void LeaveState_SubmitWithinBalance_SucceedsWithoutImmediateDeduction()
    {
        var leaveState = new LeaveState();

        var submission = leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 6, 12), new DateOnly(2026, 6, 14), 1);
        var balanceAfterSubmission = leaveState.GetBalance(1);

        Assert.True(submission.Success);
        Assert.NotNull(submission.Request);
        Assert.Equal(3, submission.Request!.Days);
        Assert.Equal(LeaveRequestStatus.Pending, submission.Request.Status);
        Assert.Equal(15, submission.RemainingDays);
        Assert.Equal(15, balanceAfterSubmission.RemainingDays);
    }

    [Fact]
    public void LeaveState_SubmissionOverCurrentRemaining_IsAllowedUntilApproval()
    {
        var leaveState = new LeaveState();

        leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 15), 1);
        var secondSubmission = leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 7, 16), new DateOnly(2026, 7, 20), 1);

        Assert.True(secondSubmission.Success);
        Assert.NotNull(secondSubmission.Request);
        Assert.Equal(5, secondSubmission.Request!.Days);
        Assert.Equal(15, secondSubmission.RemainingDays);
    }

    [Fact]
    public void LeaveState_ApprovePendingRequest_SucceedsAndDeductsBalance()
    {
        var leaveState = new LeaveState();

        var submission = leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 2), 1);
        var approval = leaveState.TryApproveLeaveRequest(submission.Request!.Id);
        var balanceAfterApproval = leaveState.GetBalance(1);

        Assert.True(approval.Success);
        Assert.NotNull(approval.Request);
        Assert.Equal(LeaveRequestStatus.Approved, approval.Request!.Status);
        Assert.Equal(2, balanceAfterApproval.UsedDays);
        Assert.Equal(13, balanceAfterApproval.RemainingDays);
    }

    [Fact]
    public void LeaveState_ApprovePendingRequest_InsufficientBalanceAtApproval_Fails()
    {
        var leaveState = new LeaveState();

        var first = leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 10), 1);
        var second = leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 8, 11), new DateOnly(2026, 8, 20), 1);

        var firstApproval = leaveState.TryApproveLeaveRequest(first.Request!.Id);
        var secondApproval = leaveState.TryApproveLeaveRequest(second.Request!.Id);

        Assert.True(firstApproval.Success);
        Assert.False(secondApproval.Success);
        Assert.Equal(ApprovalError.InsufficientBalance, secondApproval.Error);
        Assert.Contains("only 5 day(s) remain", secondApproval.Message);
    }

    [Fact]
    public void LeaveState_CancelOwnPendingRequest_SucceedsAndBlocksFutureApproval()
    {
        var leaveState = new LeaveState();

        var submission = leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 9, 5), new DateOnly(2026, 9, 6), 1);

        var cancellation = leaveState.TryCancelLeaveRequest(submission.Request!.Id, 1);
        var approvalAfterCancellation = leaveState.TryApproveLeaveRequest(submission.Request!.Id);

        Assert.True(cancellation.Success);
        Assert.Equal(LeaveRequestStatus.Cancelled, cancellation.Request!.Status);
        Assert.False(approvalAfterCancellation.Success);
        Assert.Equal(ApprovalError.NotPending, approvalAfterCancellation.Error);
    }

    [Fact]
    public void LeaveState_CancelApprovedRequest_Fails()
    {
        var leaveState = new LeaveState();

        var submission = leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 2), 1);
        leaveState.TryApproveLeaveRequest(submission.Request!.Id);

        var cancellation = leaveState.TryCancelLeaveRequest(submission.Request!.Id, 1);

        Assert.False(cancellation.Success);
        Assert.Equal(CancellationError.NotPending, cancellation.Error);
        Assert.Contains("cannot be cancelled", cancellation.Message);
    }

    [Fact]
    public void LeaveState_CancelOtherEmployeesPendingRequest_Fails()
    {
        var leaveState = new LeaveState();

        var submission = leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 11, 10), new DateOnly(2026, 11, 11), 1);

        var cancellation = leaveState.TryCancelLeaveRequest(submission.Request!.Id, 2);

        Assert.False(cancellation.Success);
        Assert.Equal(CancellationError.Unauthorized, cancellation.Error);
    }

    [Fact]
    public void LeaveState_GetBalance_IsScopedPerEmployee()
    {
        var leaveState = new LeaveState();

        var employeeOneSubmission = leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 12, 1), new DateOnly(2026, 12, 3), 1);
        leaveState.TryApproveLeaveRequest(employeeOneSubmission.Request!.Id);

        var employeeOneBalance = leaveState.GetBalance(1);
        var employeeTwoBalance = leaveState.GetBalance(2);

        Assert.Equal(3, employeeOneBalance.UsedDays);
        Assert.Equal(12, employeeOneBalance.RemainingDays);
        Assert.Equal(0, employeeTwoBalance.UsedDays);
        Assert.Equal(15, employeeTwoBalance.RemainingDays);
    }

    [Fact]
    public void LeaveState_GetRequestsForEmployee_ReturnsOnlyOwnedRequests()
    {
        var leaveState = new LeaveState();

        leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 12, 10), new DateOnly(2026, 12, 10), 1);
        leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 12, 11), new DateOnly(2026, 12, 11), 2);

        var employeeOneRequests = leaveState.GetRequestsForEmployee(1);
        var employeeTwoRequests = leaveState.GetRequestsForEmployee(2);

        Assert.Single(employeeOneRequests);
        Assert.Equal(1, employeeOneRequests[0].EmployeeId);
        Assert.Single(employeeTwoRequests);
        Assert.Equal(2, employeeTwoRequests[0].EmployeeId);
    }

    [Fact]
    public void LeaveState_ApproveAlreadyApprovedRequest_ReturnsConflictError()
    {
        var leaveState = new LeaveState();

        var submission = leaveState.TrySubmitLeaveRequest(new DateOnly(2026, 12, 20), new DateOnly(2026, 12, 21), 1);
        leaveState.TryApproveLeaveRequest(submission.Request!.Id);

        var secondApproval = leaveState.TryApproveLeaveRequest(submission.Request!.Id);

        Assert.False(secondApproval.Success);
        Assert.Equal(ApprovalError.AlreadyApproved, secondApproval.Error);
        Assert.Contains("already approved", secondApproval.Message);
    }
}
