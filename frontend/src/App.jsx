import React, { useEffect, useMemo, useState } from 'react';

const NAV_ITEMS = ['Dashboard', 'My Leave Requests', 'Team Leave Requests'];

const ROLES = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager'
};

const EMPLOYEE_ID = 1;
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function buildApiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getStatusClass(status) {
  if (status === 'Approved') {
    return 'approved';
  }

  if (status === 'Cancelled') {
    return 'cancelled';
  }

  return 'pending';
}

function EmployeeView({ activeNav }) {
  const [balance, setBalance] = useState({ baselineDays: 15, usedDays: 0, remainingDays: 15 });
  const [requests, setRequests] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('info');

  async function loadBalance() {
    const response = await fetch(buildApiUrl(`/api/employee/balance?employeeId=${EMPLOYEE_ID}`));
    if (!response.ok) {
      throw new Error('Unable to load leave balance.');
    }

    const payload = await parseJsonSafe(response);
    setBalance(payload);
  }

  async function loadRequests() {
    const response = await fetch(buildApiUrl(`/api/employee/leave-requests?employeeId=${EMPLOYEE_ID}`));
    if (!response.ok) {
      throw new Error('Unable to load leave requests.');
    }

    const payload = await parseJsonSafe(response);
    setRequests(payload);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadEmployeeData() {
      try {
        await Promise.all([loadBalance(), loadRequests()]);
      } catch {
        if (isMounted) {
          setFeedbackType('error');
          setFeedback('Unable to load employee leave data right now.');
        }
      }
    }

    loadEmployeeData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!startDate || !endDate) {
      setFeedbackType('error');
      setFeedback('Please select both start and end date.');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/api/employee/leave-requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, employeeId: EMPLOYEE_ID })
      });

      const payload = await parseJsonSafe(response);

      if (!response.ok) {
        setFeedbackType('error');
        setFeedback(payload.message ?? 'Unable to submit leave request.');
        return;
      }

      await Promise.all([loadBalance(), loadRequests()]);

      setFeedbackType('success');
      setFeedback(payload.message ?? 'Leave request submitted successfully.');
      setStartDate('');
      setEndDate('');
    } catch {
      setFeedbackType('error');
      setFeedback('Unable to submit leave request right now.');
    }
  }

  async function handleCancel(requestId) {
    try {
      const response = await fetch(buildApiUrl(`/api/employee/leave-requests/${requestId}/cancel?employeeId=${EMPLOYEE_ID}`), {
        method: 'POST'
      });

      const payload = await parseJsonSafe(response);

      if (!response.ok) {
        setFeedbackType('error');
        setFeedback(payload.message ?? 'Unable to cancel this leave request.');
        return;
      }

      await Promise.all([loadBalance(), loadRequests()]);

      setFeedbackType('success');
      setFeedback(payload.message ?? 'Leave request cancelled successfully.');
    } catch {
      setFeedbackType('error');
      setFeedback('Unable to cancel this leave request right now.');
    }
  }

  return (
    <section className="content" aria-label="Employee View">
      <h1>Employee View</h1>
      <p className="meta">Current section: {activeNav}</p>

      <div className="balance-card" aria-label="Leave balance">
        <h2>Leave Balance</h2>
        <p>
          Remaining Days: <strong>{balance.remainingDays}</strong>
        </p>
        <p className="muted">
          Baseline: {balance.baselineDays} | Used: {balance.usedDays}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="leave-form" aria-label="Leave request form">
        <h2>Submit Leave Request</h2>

        <label htmlFor="start-date">Start Date</label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <label htmlFor="end-date">End Date</label>
        <input id="end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />

        <button type="submit" className="submit-button">
          Submit Request
        </button>
      </form>

      <div className="request-panel" aria-label="My leave requests">
        <h2>My Leave Requests</h2>
        {requests.length === 0 ? (
          <p className="muted">No leave requests submitted yet.</p>
        ) : (
          <table className="requests-table" aria-label="My leave requests table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Start</th>
                <th>End</th>
                <th>Days</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td>{request.startDate}</td>
                  <td>{request.endDate}</td>
                  <td>{request.days}</td>
                  <td>
                    <span className={`status ${getStatusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td>
                    {request.status === 'Pending' ? (
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => handleCancel(request.id)}
                        aria-label={`Cancel request ${request.id}`}
                      >
                        Cancel
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {feedback && (
        <p role="status" className={feedbackType === 'error' ? 'feedback error' : 'feedback success'}>
          {feedback}
        </p>
      )}
    </section>
  );
}

function ManagerView({ activeNav }) {
  const [requests, setRequests] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');

  async function loadRequests() {
    try {
      const response = await fetch(buildApiUrl('/api/manager/leave-requests'));
      if (!response.ok) {
        setFeedbackType('error');
        setFeedback('Unable to load team leave requests.');
        return;
      }

      const payload = await parseJsonSafe(response);
      setRequests(payload);
    } catch {
      setFeedbackType('error');
      setFeedback('Unable to load team leave requests.');
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleApprove(requestId) {
    try {
      const response = await fetch(buildApiUrl(`/api/manager/leave-requests/${requestId}/approve`), {
        method: 'POST'
      });

      const payload = await parseJsonSafe(response);

      if (!response.ok) {
        setFeedbackType('error');
        setFeedback(payload.message ?? 'Unable to approve this request.');
        await loadRequests();
        return;
      }

      setFeedbackType('success');
      setFeedback(payload.message ?? 'Leave request approved successfully.');
      await loadRequests();
    } catch {
      setFeedbackType('error');
      setFeedback('Unable to approve this request.');
    }
  }

  return (
    <section className="content" aria-label="Manager View">
      <h1>Manager View</h1>
      <p className="meta">Current section: {activeNav}</p>

      <div className="request-panel">
        <h2>Team Leave Requests</h2>
        {requests.length === 0 ? (
          <p className="muted">No leave requests submitted yet.</p>
        ) : (
          <table className="requests-table" aria-label="Team leave requests table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Start</th>
                <th>End</th>
                <th>Days</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td>{request.startDate}</td>
                  <td>{request.endDate}</td>
                  <td>{request.days}</td>
                  <td>
                    <span className={`status ${getStatusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td>
                    {request.status === 'Pending' ? (
                      <button
                        type="button"
                        className="approve-button"
                        onClick={() => handleApprove(request.id)}
                        aria-label={`Approve request ${request.id}`}
                      >
                        Approve
                      </button>
                    ) : (
                      <span className="muted">{request.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {feedback && <p role="status" className={feedbackType === 'error' ? 'feedback error' : 'feedback success'}>{feedback}</p>}
    </section>
  );
}

export default function App() {
  const [role, setRole] = useState(ROLES.EMPLOYEE);
  const [activeNav, setActiveNav] = useState(NAV_ITEMS[0]);

  const isEmployee = useMemo(() => role === ROLES.EMPLOYEE, [role]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation sidebar">
        <h2 className="brand">LMS</h2>

        <label htmlFor="role-switcher" className="role-label">
          Role
        </label>
        <select
          id="role-switcher"
          className="role-switcher"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value={ROLES.EMPLOYEE}>Employee</option>
          <option value={ROLES.MANAGER}>Manager</option>
        </select>

        <nav aria-label="Primary navigation">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className={item === activeNav ? 'nav-button active' : 'nav-button'}
                  onClick={() => setActiveNav(item)}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="main-panel">
        {isEmployee ? <EmployeeView activeNav={activeNav} /> : <ManagerView activeNav={activeNav} />}
      </main>
    </div>
  );
}
