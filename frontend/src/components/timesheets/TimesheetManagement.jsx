import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export const TimesheetManagement = ({
  employees = [],
  selectedEmployeeId = '',
  onSelectEmployee,
  timesheets = [],
  timesheetsLoading = false,
  timesheetsError = null,
  onAddTimesheet,
  onApproveTimesheet,
  onRejectTimesheet,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('Enterprise AI Portal Core');
  const [taskDescription, setTaskDescription] = useState('');
  const [hoursLogged, setHoursLogged] = useState(8);
  const [isBillable, setIsBillable] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeMetric, setActiveMetric] = useState(null);

  const selectedEmployee =
    employees.find((employee) => employee.empId === selectedEmployeeId) || null;

  const safeTimesheets = Array.isArray(timesheets) ? timesheets : [];

  const billableHours = safeTimesheets
    .filter(
      (timesheet) =>
        Boolean(timesheet?.isBillable) ||
        Number(timesheet?.clientBillingHours || 0) > 0
    )
    .reduce(
      (total, timesheet) => total + Number(timesheet?.hoursLogged || 0),
      0
    );

  const pendingEntries = safeTimesheets.filter((timesheet) => {
    const status = String(timesheet.status || 'Pending').toLowerCase();
    return status === 'pending' || status === 'submitted';
  });

  const approvedEntries = safeTimesheets.filter(
    (timesheet) =>
      String(timesheet.status || '').toLowerCase() === 'approved'
  );

  const rejectedEntries = safeTimesheets.filter(
    (timesheet) =>
      String(timesheet.status || '').toLowerCase() === 'rejected'
  );

  // Filters the table based on the selected card, search, and status dropdown.
  // Then sorts entries by highest logged hours first.
  const filteredTimesheets = safeTimesheets
    .filter((timesheet) => {
      const haystack = [
        timesheet.empName,
        timesheet.empId,
        timesheet.projectName,
        timesheet.taskDescription,
        timesheet.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !searchQuery || haystack.includes(searchQuery.toLowerCase());

      const statusValue = String(timesheet.status || 'Pending').toUpperCase();

      const isPendingOrSubmitted =
        statusValue === 'PENDING' || statusValue === 'SUBMITTED';

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && isPendingOrSubmitted) ||
        statusValue === statusFilter;

      const isBillableEntry =
        Boolean(timesheet.isBillable) ||
        Number(timesheet.clientBillingHours || 0) > 0;

      const matchesMetric =
        activeMetric !== 'BILLABLE' || isBillableEntry;

      return matchesSearch && matchesStatus && matchesMetric;
    })
    .sort((a, b) => {
      const hoursDifference =
        Number(b.hoursLogged || 0) - Number(a.hoursLogged || 0);

      if (hoursDifference === 0) {
        return new Date(b.date || 0) - new Date(a.date || 0);
      }

      return hoursDifference;
    });

  const summaryMetrics = [
    {
      label: 'Pending review',
      value: pendingEntries.length,
      tone: 'amber',
      icon: Clock,
      filter: 'PENDING',
    },
    {
      label: 'Approved',
      value: approvedEntries.length,
      tone: 'emerald',
      icon: CheckCircle2,
      filter: 'APPROVED',
    },
    {
      label: 'Rejected',
      value: rejectedEntries.length,
      tone: 'rose',
      icon: AlertCircle,
      filter: 'REJECTED',
    },
    {
      label: 'Billable hours',
      value: `${billableHours} hrs`,
      tone: 'violet',
      icon: DollarSign,
      filter: 'BILLABLE',
    },
  ];

  const handleMetricClick = (metric) => {
    const isSameCard = activeMetric === metric.filter;

    if (isSameCard) {
      setActiveMetric(null);
      setStatusFilter('ALL');
      return;
    }

    setActiveMetric(metric.filter);

    if (metric.filter === 'BILLABLE') {
      setStatusFilter('ALL');
    } else {
      setStatusFilter(metric.filter);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedEmployeeId) {
      alert('Please select an employee before submitting a timesheet.');
      return;
    }

    const employeeName =
      selectedEmployee?.employeeName ||
      selectedEmployee?.name ||
      [selectedEmployee?.firstName, selectedEmployee?.lastName]
        .filter(Boolean)
        .join(' ') ||
      selectedEmployeeId;

    const newEntry = {
      empId: selectedEmployeeId,
      empName: employeeName,
      date: new Date().toISOString().split('T')[0],
      projectName,
      taskDescription,
      hoursLogged: Number(hoursLogged),
      isBillable,
      status: 'Submitted',
    };

    await onAddTimesheet(newEntry);
    setShowModal(false);
    setTaskDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-950 p-6 text-white shadow-xl shadow-indigo-950/15 dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-bold uppercase tracking-[0.18em] text-indigo-100">
              <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-200" />
              Time & billing
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-white">
              Daily Timesheets & Client Billing Tracker
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Project allocation hours, client billable ratio calculations, and
              manager sign-off across active delivery workstreams.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-lg shadow-slate-950/15 transition hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" />
            Log Time Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryMetrics.map((metric) => {
          const Icon = metric.icon;

          const toneClasses = {
            amber:
              'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
            emerald:
              'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
            rose:
              'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
            violet:
              'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300',
          }[metric.tone];

          return (
            <button
              key={metric.label}
              type="button"
              onClick={() => handleMetricClick(metric)}
              className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:bg-slate-900 ${
                activeMetric === metric.filter
                  ? 'border-indigo-500 ring-2 ring-indigo-400/40 dark:border-indigo-400'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{metric.label}</span>

                <span className={`rounded-full border p-2 ${toneClasses}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {metric.value}
              </div>

              <p className="mt-2 text-[10px] font-medium text-slate-400">
                {activeMetric === metric.filter
                  ? 'Click again to show all entries'
                  : 'Click to view employees'}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Logged Timesheet Entries
            </h3>

            {activeMetric && (
              <p className="mt-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                Showing:{' '}
                {activeMetric === 'BILLABLE'
                  ? 'Billable employees'
                  : `${activeMetric.toLowerCase()} employees`}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search employee or project"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setActiveMetric(null);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending / Submitted</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {timesheetsLoading && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Loading timesheets...
          </div>
        )}

        {!timesheetsLoading && timesheetsError && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {timesheetsError}
          </div>
        )}

        {!timesheetsLoading && !timesheetsError && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-400 dark:border-slate-800">
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Employee</th>
                  <th className="px-2 py-3">Project</th>
                  <th className="px-2 py-3">Task Deliverable</th>
                  <th className="px-2 py-3">Hours Logged ↓</th>
                  <th className="px-2 py-3">Billable Status</th>
                  <th className="px-2 py-3">Approval</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTimesheets.map((timesheet, index) => {
                  const statusText = timesheet.status || 'Pending';

                  const canAct =
                    Boolean(timesheet.id) &&
                    !['Approved', 'Rejected'].includes(statusText);

                  const isBillableEntry =
                    Boolean(timesheet.isBillable) ||
                    Number(timesheet.clientBillingHours || 0) > 0;

                  return (
                    <tr
                      key={
                        timesheet.id ||
                        `${timesheet.empId || 'unknown'}-${
                          timesheet.date || 'date'
                        }-${index}`
                      }
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-2 py-3 font-mono text-slate-500">
                        {timesheet.date || 'N/A'}
                      </td>

                      <td className="px-2 py-3 font-bold text-slate-900 dark:text-white">
                        {timesheet.empName ||
                          timesheet.empId ||
                          'Unknown employee'}
                      </td>

                      <td className="px-2 py-3 font-semibold text-indigo-600 dark:text-indigo-400">
                        {timesheet.projectName || 'Unspecified project'}
                      </td>

                      <td className="max-w-xs truncate px-2 py-3 text-slate-600 dark:text-slate-300">
                        {timesheet.taskDescription ||
                          'No task description provided'}
                      </td>

                      <td className="px-2 py-3 font-bold text-slate-900 dark:text-white">
                        {Number(timesheet.hoursLogged || 0)} hrs
                      </td>

                      <td className="px-2 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isBillableEntry
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {isBillableEntry
                            ? 'Client Billable'
                            : 'Internal Non-Billable'}
                        </span>
                      </td>

                      <td className="px-2 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              statusText === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : statusText === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {statusText}
                          </span>

                          {canAct && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  onApproveTimesheet?.(timesheet.id)
                                }
                                className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  onRejectTimesheet?.(timesheet.id)
                                }
                                className="rounded bg-rose-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-700"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTimesheets.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                No employees found for this selection.
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-white">
            <h3 className="border-b border-slate-100 pb-3 text-base font-bold dark:border-slate-800">
              Log Project Hours
            </h3>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold">Employee</label>

                <select
                  value={selectedEmployeeId}
                  onChange={(event) => onSelectEmployee(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800"
                  required
                >
                  <option value="">Select an employee</option>

                  {employees.map((employee) => {
                    const fullName =
                      [employee.firstName, employee.lastName]
                        .filter(Boolean)
                        .join(' ') ||
                      employee.employeeName ||
                      employee.name ||
                      employee.empId;

                    return (
                      <option key={employee.empId} value={employee.empId}>
                        {fullName} ({employee.empId})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold">
                  Project Name
                </label>

                <input
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold">
                  Task Deliverable
                </label>

                <textarea
                  required
                  rows={2}
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                  placeholder="Describe task progress..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold">
                    Hours Logged
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={hoursLogged}
                    onChange={(event) =>
                      setHoursLogged(Number(event.target.value))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isBillable}
                      onChange={(event) => setIsBillable(event.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />

                    <span className="text-xs font-semibold">
                      Is Client Billable?
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
                >
                  Submit Timesheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
