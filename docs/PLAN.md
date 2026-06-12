# Implementation Plan

This document is append-only. Prior plan versions are immutable.

---

# Version v1.0

## Change Summary
Implement the initial Leave Management System defined in PRD v1.0: role-based Employee/Manager views, leave balance visibility, leave request submission with date range validation against remaining balance, and manager approval flow.

## Dependencies
- Product requirements baseline: PRD v1.0 (`docs/PRD.md`)
- UI constraints: `docs/UI-contract.md`

## Implementation Steps

### Step v1.0.1

Goal:
Establish an end-to-end runnable shell with a single-file Minimal API backend (in-memory state) and a flat React/Vite frontend skeleton that enforces the UI contract (left sidebar, fixed navigation, role switcher, separated role views).

Files Affected:
- `backend/Program.cs`
- `backend/LMS.csproj`
- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/styles.css`

Expected Visible Outcome:
Application starts successfully; user can switch between Employee and Manager views using a role switcher, with left-sidebar navigation showing Dashboard, My Leave Requests, and Team Leave Requests.

### Step v1.0.2

Goal:
Implement employee leave balance and leave request submission flow using start/end dates, including backend validation that blocks requests exceeding remaining balance.

Files Affected:
- `backend/Program.cs`
- `frontend/src/App.jsx`
- `frontend/src/styles.css`

Expected Visible Outcome:
Employee can view current balance (starting at 15 days), submit a leave request with start and end dates, and immediately see success/failure feedback when request exceeds available balance.

### Step v1.0.3

Goal:
Implement manager approval workflow and complete baseline test coverage with xUnit for leave-rule validation and approval transitions.

Files Affected:
- `backend/Program.cs`
- `backend/tests/LMS.Tests.csproj`
- `backend/tests/LeaveApiTests.cs`
- `frontend/src/App.jsx`

Expected Visible Outcome:
Manager view lists submitted requests and supports approval action; approved state is reflected in UI/API behavior; automated xUnit tests pass for entitlement baseline, balance validation, and approval flow.

## Completion Criteria
- Frontend and backend run together with a functioning end-to-end LMS shell from step v1.0.1 onward.
- Employee starts with 15 days leave balance and can view it in the UI.
- Leave requests require start and end date and are blocked when exceeding remaining balance.
- Manager can approve submitted leave requests in Manager view.
- UI contract is preserved: left sidebar navigation, fixed nav items, and role-separated views via role switcher.
- xUnit tests validate core business rules and approval transitions.

---

# Version v1.1

## Change Summary
Implement PRD v1.1 deltas: deduct leave balance only on manager approval, allow employees to cancel their own pending requests, and enforce balance validation at approval transition instead of submission.

## Dependencies
- Completed baseline implementation from Version v1.0 (steps v1.0.1-v1.0.3).
- Product requirement changes in PRD v1.1 (`docs/PRD.md`).
- Existing UI contract in `docs/UI-contract.md` remains mandatory.

## Implementation Steps

### Step v1.1.1

Goal:
Refactor backend in `Program.cs` in-place so pending requests no longer consume balance, approval performs remaining-balance validation and deduction, and employee cancellation of own pending requests is supported with clear status outcomes.

Files Affected:
- `backend/Program.cs`
- `backend/tests/LeaveApiTests.cs`

Expected Visible Outcome:
Submitting a leave request creates a pending item without reducing displayed balance; approving a request updates status and then decreases balance; pending requests can be cancelled by employee and become non-approvable.

### Step v1.1.2

Goal:
Update Employee and Manager UI workflows in flat `App.jsx` so employees can cancel pending requests and see balance unaffected until approval, while managers approve only eligible pending requests with immediate feedback.

Files Affected:
- `frontend/src/App.jsx`
- `frontend/src/styles.css`
- `frontend/src/App.test.jsx`

Expected Visible Outcome:
Employee view shows pending requests with Cancel action; cancelling removes/marks pending request accordingly; balance changes only after manager approval; manager view reflects approval/cancellation state transitions without breaking role separation.

### Step v1.1.3

Goal:
Finalize regression and delta validation with compact automated tests covering approval-time balance checks, cancellation rules, and UI feedback paths.

Files Affected:
- `backend/tests/LMS.Tests.csproj`
- `backend/tests/LeaveApiTests.cs`
- `backend/tests/ShellApiTests.cs`
- `frontend/src/App.test.jsx`

Expected Visible Outcome:
Automated tests pass for v1.0 baseline plus v1.1 deltas: no deduction on submit, deduction on approve, employee-only pending cancellation, blocked approval of cancelled/non-eligible requests, and consistent role-based UI behavior.

## Completion Criteria
- Submitting a leave request creates Pending state and does not reduce leave balance.
- Manager approval is the only transition that reduces leave balance and must fail when insufficient remaining balance exists at approval time.
- Employee can cancel only their own pending requests; approved requests cannot be cancelled by employee.
- Cancelled requests cannot be approved.
- Employee and Manager UI flows expose these transitions while preserving sidebar navigation, fixed nav items, and role-switcher separation model.
- Backend and frontend automated tests cover v1.1 rules and pass successfully.
