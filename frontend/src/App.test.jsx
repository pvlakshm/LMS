import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    let nextRequestId = 2;
    const requests = [
      {
        id: 1,
        employeeId: 1,
        startDate: '2026-06-12',
        endDate: '2026-06-14',
        days: 3,
        status: 'Pending'
      }
    ];

    const computeBalance = () => {
      const usedDays = requests
        .filter((request) => request.employeeId === 1 && request.status === 'Approved')
        .reduce((sum, request) => sum + request.days, 0);

      return {
        baselineDays: 15,
        usedDays,
        remainingDays: 15 - usedDays
      };
    };

    global.fetch = vi.fn((url, options) => {
      if (typeof url !== 'string') {
        return Promise.resolve({ ok: false, json: async () => ({ message: 'Unknown request' }) });
      }

      if (url.startsWith('/api/employee/balance')) {
        return Promise.resolve({
          ok: true,
          json: async () => computeBalance()
        });
      }

      if (url.startsWith('/api/employee/leave-requests?')) {
        return Promise.resolve({
          ok: true,
          json: async () => requests.filter((request) => request.employeeId === 1)
        });
      }

      if (url === '/api/employee/leave-requests' && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        const requestedDays =
          (new Date(body.endDate).getTime() - new Date(body.startDate).getTime()) / (1000 * 60 * 60 * 24) + 1;

        const request = {
          id: nextRequestId++,
          employeeId: body.employeeId,
          startDate: body.startDate,
          endDate: body.endDate,
          days: requestedDays,
          status: 'Pending'
        };

        requests.push(request);

        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Leave request submitted successfully.',
            request,
            remainingDays: computeBalance().remainingDays
          })
        });
      }

      if (url.includes('/api/employee/leave-requests/') && url.includes('/cancel') && options?.method === 'POST') {
        const requestId = Number(url.split('/')[4]);
        const request = requests.find((item) => item.id === requestId && item.employeeId === 1);

        if (!request) {
          return Promise.resolve({ ok: false, json: async () => ({ message: `Leave request ${requestId} was not found.` }) });
        }

        if (request.status !== 'Pending') {
          return Promise.resolve({
            ok: false,
            json: async () => ({ message: `Leave request ${requestId} is not pending and cannot be cancelled.` })
          });
        }

        request.status = 'Cancelled';

        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Leave request cancelled successfully.', request })
        });
      }

      if (url === '/api/manager/leave-requests') {
        return Promise.resolve({
          ok: true,
          json: async () => requests
        });
      }

      if (url.includes('/api/manager/leave-requests/') && url.endsWith('/approve') && options?.method === 'POST') {
        const requestId = Number(url.split('/')[4]);
        const request = requests.find((item) => item.id === requestId);

        if (!request) {
          return Promise.resolve({ ok: false, json: async () => ({ message: `Leave request ${requestId} was not found.` }) });
        }

        if (request.status !== 'Pending') {
          return Promise.resolve({
            ok: false,
            json: async () => ({ message: `Leave request ${requestId} is not pending and cannot be approved.` })
          });
        }

        const remainingDays = computeBalance().remainingDays;
        if (request.days > remainingDays) {
          return Promise.resolve({
            ok: false,
            json: async () => ({
              message: `Cannot approve request ${requestId}: requested ${request.days} day(s), but only ${remainingDays} day(s) remain.`
            })
          });
        }

        request.status = 'Approved';

        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Leave request approved successfully.', request })
        });
      }

      return Promise.resolve({ ok: false, json: async () => ({ message: 'Unknown request' }) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders left sidebar with fixed navigation items', async () => {
    render(<App />);

    expect(screen.getByLabelText('Primary navigation sidebar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Leave Requests' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Team Leave Requests' })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/Remaining Days:/i)).toBeInTheDocument());
  });

  test('shows employee and manager as separated views via role switcher', async () => {
    render(<App />);

    const roleSwitcher = screen.getByLabelText('Role');

    expect(screen.getByRole('heading', { name: 'Employee View' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Manager View' })).not.toBeInTheDocument();

    fireEvent.change(roleSwitcher, { target: { value: 'Manager' } });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Manager View' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Employee View' })).not.toBeInTheDocument();
  });

  test('employee submission keeps balance unchanged until manager approval', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText(/Remaining Days:/i)).toBeInTheDocument());
    expect(screen.getByText('15')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-07-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-07-03' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Leave request submitted successfully.'));
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel request 2' })).toBeInTheDocument();
  });

  test('employee can cancel own pending request', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel request 1' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel request 1' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Leave request cancelled successfully.'));
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel request 1' })).not.toBeInTheDocument();
  });

  test('manager approves pending request and employee balance updates after approval', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Manager' } });

    const approveButton = await screen.findByRole('button', { name: 'Approve request 1' });
    fireEvent.click(approveButton);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Leave request approved successfully.'));
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Employee' } });
    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument());
  });

  test('manager cannot approve cancelled request because action is not shown', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel request 1' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel request 1' }));

    await waitFor(() => expect(screen.getByText('Cancelled')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Manager' } });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Manager View' })).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: 'Approve request 1' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0);
  });

  test('manager gets approval-time error feedback when request exceeds remaining balance', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText(/Remaining Days:/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-08-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel request 2' })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Manager' } });

    const approveButton = await screen.findByRole('button', { name: 'Approve request 2' });
    fireEvent.click(approveButton);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('only 15 day(s) remain'));
  });

  test('shows friendly error when leave submission request fails at network level', async () => {
    global.fetch = vi.fn((url, options) => {
      if (typeof url === 'string' && url.startsWith('/api/employee/balance')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ baselineDays: 15, usedDays: 0, remainingDays: 15 })
        });
      }

      if (typeof url === 'string' && url.startsWith('/api/employee/leave-requests?')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      if (url === '/api/employee/leave-requests' && options?.method === 'POST') {
        return Promise.reject(new Error('Network down'));
      }

      if (url === '/api/manager/leave-requests') {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      return Promise.resolve({ ok: false, json: async () => ({ message: 'Unknown request' }) });
    });

    render(<App />);

    await waitFor(() => expect(screen.getByText(/Remaining Days:/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-09-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Unable to submit leave request right now.'));
  });
});
