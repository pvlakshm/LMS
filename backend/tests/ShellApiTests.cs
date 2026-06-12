using Xunit;

namespace LMS.Tests;

public class ShellApiTests
{
    [Fact]
    public void ShellContract_ContainsExpectedNavigationItems()
    {
        Assert.Equal(new[] { "Dashboard", "My Leave Requests", "Team Leave Requests" }, ShellContract.Navigation);
    }

    [Fact]
    public void ShellContract_ContainsEmployeeAndManagerRoles()
    {
        Assert.Equal(new[] { UserRole.Employee, UserRole.Manager }, ShellContract.Roles);
    }
}
