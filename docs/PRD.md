# Product Requirements Document (PRD)

This document is append-only. Prior versions are immutable.

---

## Version
v1.0

## Source
Initial product request from `docs/user-notes.md` and UI constraints from `docs/UI-contract.md`.

## Summary
Define an initial, rules-based Leave Management System (LMS) where Employees can view leave balance and submit leave requests, and Managers can approve those requests. The application must follow the specified UI navigation and role separation contract.

## Requirements
- The system shall support two roles: Employee and Manager.
- Every Employee shall start with a baseline annual leave balance of **15 days**.
- Employee view shall allow users to:
  - See current leave balance.
  - Submit a leave request.
- Leave request submission shall require:
  - Start date.
  - End date.
- The system shall prevent submission of a leave request when the requested duration exceeds the employee's remaining leave balance.
- Leave requests shall require Manager approval before becoming approved leave.
- Implementation stack constraints:
  - Frontend: React (JavaScript) with Vite tooling.
  - Backend: ASP.NET Core Minimal API targeting .NET 10.0.
  - Test framework: xUnit.

## Business Rules
- Annual leave entitlement starts at **15 days per employee**.
- Requested leave duration must not exceed currently available leave balance.
- Manager approval is mandatory for leave request approval.
- Role views must remain separated (Employee vs Manager) and switched using a role switcher.

## UI Impact
- UI must preserve the existing UI Contract:
  - Left sidebar for primary navigation.
  - Stable navigation structure:
    - Dashboard
    - My Leave Requests
    - Team Leave Requests
  - Employee and Manager views are separate and must not be shown side-by-side.
  - Role switcher must be used to switch views.
- Initial UI scope additions:
  - Employee balance display in Employee view.
  - Leave request form with start and end date fields.
  - Manager-facing approval interaction in Team Leave Requests flow.

## API Impact
- Introduce API capabilities for:
  - Retrieving an employee leave balance.
  - Creating a leave request with start and end dates.
  - Validating leave request duration against remaining balance.
  - Manager approval action for submitted leave requests.
- No prior API contract exists in this version; this version establishes the baseline contract direction.

## Acceptance Criteria
- Given an Employee with 15 days leave, when they open the system, then they can view their available leave balance.
- Given an Employee creating a leave request, when they provide start and end dates within available balance, then the request is submitted successfully.
- Given an Employee creating a leave request exceeding available balance, when they attempt submission, then submission is blocked with a validation outcome.
- Given a submitted leave request, when viewed by a Manager, then the Manager can approve it.
- Given the UI, when navigating the app, then left sidebar navigation and role-switch behavior comply with `docs/UI-contract.md`.

## Affected Areas
- Employee Dashboard (balance visibility).
- My Leave Requests workflow (request submission).
- Team Leave Requests workflow (manager approval).
- Role switcher behavior and role-scoped page rendering.
- Backend leave request and approval endpoints.
- Leave balance rule validation logic.

---

## Version
v1.1

## Source
Stakeholder feedback from `docs/stakeholderfeedback.md`.

## Summary
Adjust leave accounting so employee leave balance is deducted only after manager approval, and add employee-initiated cancellation for pending leave requests.

## Requirements
- The system shall deduct leave balance only when a leave request transitions to **Approved** status.
- The system shall allow an Employee to cancel their own leave request while the request is in **Pending** status.
- The system shall prevent cancellation of leave requests that are already approved.
- **Superseded requirement:** PRD v1.0 Requirement "The system shall prevent submission of a leave request when the requested duration exceeds the employee's remaining leave balance" is superseded by v1.1 behavior requiring balance validation at approval time (not at submission time).

## Business Rules
- Pending leave requests do not consume leave balance.
- Leave balance consumption occurs only on manager approval.
- Employee cancellation is allowed only for that employee's own pending requests.
- Approved requests are immutable for employee cancellation in this version.

## UI Impact
- Employee view must expose a cancel action for each pending leave request owned by the employee.
- Employee leave balance display must reflect only approved leaves, not pending requests.
- Manager view remains role-separated and continues to provide approval actions under existing UI contract constraints (left sidebar, fixed navigation, role switcher, no side-by-side role views).

## API Impact
- Modify leave-balance behavior so balance calculations exclude pending requests and include only approved requests.
- Add employee cancellation capability for pending requests (e.g., cancel endpoint/action).
- Update approval workflow validation to enforce remaining-balance checks at approval transition.
- Approval/cancellation responses must clearly indicate status transition outcomes and validation failures.

## Acceptance Criteria
- Given a pending leave request, when it is submitted but not approved, then employee remaining balance does not decrease.
- Given a pending leave request within available balance, when the Manager approves it, then the employee remaining balance decreases by the request duration.
- Given a pending leave request that the Employee owns, when the Employee cancels it, then the request is marked cancelled/removed per system policy and cannot be approved afterward.
- Given an approved leave request, when the Employee attempts cancellation, then the system blocks the action with an appropriate validation outcome.
- Given the UI, when using role-based workflows, then existing UI contract and role-separation behavior remain unchanged.

## Affected Areas
- Leave balance calculation rules and data state transitions.
- Employee request lifecycle in My Leave Requests (pending -> cancelled).
- Manager approval workflow in Team Leave Requests (pending -> approved with balance deduction).
- API contracts for approval timing and cancellation actions.
- Validation logic for approval-time balance checks and cancellation eligibility.
