import React, { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  FileText,
  CheckCircle2,
  Calculator,
  Search,
  Download,
  Printer,
  X,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Gift,
  ReceiptText,
} from 'lucide-react';
import { api } from '../../services/api';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const formatMoney = (value) => currency.format(Number(value || 0));

const formatNumber = (value) =>
  new Intl.NumberFormat('en-US').format(Number(value || 0));

const getTimeGreeting = (name = 'Employee') => {
  const hour = new Date().getHours();

  if (hour < 12) return `Good morning, ${name} 👋`;
  if (hour < 17) return `Good afternoon, ${name} 👋`;
  return `Good evening, ${name} 👋`;
};

const getCurrentDateLabel = () =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

const getCurrentTimeLabel = () =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());

const getEmpId = (record) =>
  record?.empId ||
  record?.EmpID ||
  record?.EmpId ||
  record?.employeeId ||
  record?.employee_id ||
  null;

const getEmployeeName = (record) =>
  record?.empName ||
  record?.employeeName ||
  record?.EmployeeName ||
  record?.name ||
  getEmpId(record) ||
  'Unknown Employee';

const getDesignation = (record) =>
  record?.designation ||
  record?.Designation ||
  record?.jobTitle ||
  record?.JobTitle ||
  '-';

const getPayrollMonth = (record) =>
  record?.PayrollMonth ||
  record?.payrollMonth ||
  record?.month ||
  record?.payPeriod ||
  'N/A';

const getBaseSalary = (record) =>
  Number(record?.baseSalary ?? record?.BasicSalary ?? record?.basicSalary ?? 0);

const getOvertimePay = (record) =>
  Number(record?.overtimePay ?? record?.OvertimePay ?? 0);

const getPerformanceBonus = (record) =>
  Number(
    record?.performanceBonus ??
      record?.bonus ??
      record?.Bonus ??
      record?.PerformanceBonus ??
      0
  );

const getTaxDeductions = (record) =>
  Number(
    record?.taxDeductions ??
      record?.tax ??
      record?.Tax ??
      record?.TaxDeductions ??
      0
  );

const getOtherDeductions = (record) =>
  Number(
    record?.otherDeductions ??
      record?.OtherDeductions ??
      record?.deductions ??
      record?.Deductions ??
      0
  );

const getNetPay = (record) =>
  Number(
    record?.netPay ??
      record?.NetSalary ??
      record?.netSalary ??
      record?.NetPay ??
      0
  );

const getPayrollStatus = (record) =>
  String(
    record?.status ||
      record?.Status ||
      record?.payrollStatus ||
      record?.PayrollStatus ||
      'Processed'
  );

const getMonthSortValue = (record) => {
  const month = getPayrollMonth(record);

  if (!month || month === 'N/A') return '0000-00';

  const parsed = new Date(month);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 7);
  }

  return String(month);
};

const statusClasses = (status) => {
  const normalized = String(status || '').toLowerCase();

  if (
    normalized.includes('paid') ||
    normalized.includes('approved') ||
    normalized.includes('processed') ||
    normalized.includes('complete')
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300';
  }

  if (
    normalized.includes('pending') ||
    normalized.includes('draft') ||
    normalized.includes('review')
  ) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300';
  }

  if (
    normalized.includes('reject') ||
    normalized.includes('failed') ||
    normalized.includes('error')
  ) {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export const PayrollManagement = ({
  payrollRecords = [],
  payrollLoading = false,
  payrollError = null,
  userRole = 'EMPLOYEE',
  currentEmpId = null,
  currentEmpName = 'Employee',
}) => {
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [animatedNetPay, setAnimatedNetPay] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('latest');

  const [downloadLoading, setDownloadLoading] = useState(false);

  const safePayrollRecords = Array.isArray(payrollRecords)
    ? payrollRecords
    : [];

  const isHrAdmin =
    String(userRole || '').toUpperCase() === 'HR_ADMIN';

  /*
   * Employees see only their own payroll.
   * HR admins see all payroll records.
   */
  const visiblePayrollRecords = useMemo(() => {
    if (isHrAdmin) {
      return safePayrollRecords;
    }

    return safePayrollRecords.filter((record) => {
      const recordEmpId = getEmpId(record);

      return (
        recordEmpId &&
        currentEmpId &&
        String(recordEmpId) === String(currentEmpId)
      );
    });
  }, [safePayrollRecords, isHrAdmin, currentEmpId]);

  /*
   * Sort newest payroll first.
   */
  const sortedPayrollRecords = useMemo(() => {
    return [...visiblePayrollRecords].sort((a, b) => {
      return getMonthSortValue(b).localeCompare(getMonthSortValue(a));
    });
  }, [visiblePayrollRecords]);

  /*
   * Available months for the filter.
   */
  const availableMonths = useMemo(() => {
    return [...new Set(sortedPayrollRecords.map(getPayrollMonth))]
      .filter(Boolean)
      .sort((a, b) => String(b).localeCompare(String(a)));
  }, [sortedPayrollRecords]);

  /*
   * Filter + search + sorting.
   */
  const filteredPayrollRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const filtered = sortedPayrollRecords.filter((record) => {
      const month = getPayrollMonth(record);
      const employee = getEmployeeName(record);
      const employeeId = getEmpId(record);
      const status = getPayrollStatus(record);

      const matchesSearch =
        !query ||
        String(employee).toLowerCase().includes(query) ||
        String(employeeId || '').toLowerCase().includes(query) ||
        String(month).toLowerCase().includes(query);

      const matchesMonth =
        monthFilter === 'ALL' || String(month) === String(monthFilter);

      const matchesStatus =
        statusFilter === 'ALL' ||
        String(status).toLowerCase() === String(statusFilter).toLowerCase();

      return matchesSearch && matchesMonth && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'netHigh') {
        return getNetPay(b) - getNetPay(a);
      }

      if (sortBy === 'netLow') {
        return getNetPay(a) - getNetPay(b);
      }

      if (sortBy === 'salaryHigh') {
        return getBaseSalary(b) - getBaseSalary(a);
      }

      if (sortBy === 'salaryLow') {
        return getBaseSalary(a) - getBaseSalary(b);
      }

      return getMonthSortValue(b).localeCompare(getMonthSortValue(a));
    });
  }, [
    sortedPayrollRecords,
    searchTerm,
    monthFilter,
    statusFilter,
    sortBy,
  ]);

  /*
   * Latest payroll period.
   */
  const latestRecord = sortedPayrollRecords[0] || null;

  /*
   * IMPORTANT:
   * Current-period values are taken from latestRecord.
   *
   * This fixes the original component's issue where salary/bonus/
   * deductions were summed across all months while net pay came
   * from only the latest month.
   */
  const currentPeriod = useMemo(() => {
    if (!latestRecord) {
      return {
        baseSalary: 0,
        overtimePay: 0,
        performanceBonus: 0,
        taxDeductions: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        grossPay: 0,
        netPay: 0,
      };
    }

    const baseSalary = getBaseSalary(latestRecord);
    const overtimePay = getOvertimePay(latestRecord);
    const performanceBonus = getPerformanceBonus(latestRecord);
    const taxDeductions = getTaxDeductions(latestRecord);
    const otherDeductions = getOtherDeductions(latestRecord);

    const grossPay =
      baseSalary + overtimePay + performanceBonus;

    const totalDeductions =
      taxDeductions + otherDeductions;

    const calculatedNetPay =
      grossPay - totalDeductions;

    const recordedNetPay = getNetPay(latestRecord);

    return {
      baseSalary,
      overtimePay,
      performanceBonus,
      taxDeductions,
      otherDeductions,
      totalDeductions,
      grossPay,
      netPay:
        recordedNetPay !== 0
          ? recordedNetPay
          : Math.max(calculatedNetPay, 0),
    };
  }, [latestRecord]);

  /*
   * Year-to-date payroll.
   */
  const ytdSummary = useMemo(() => {
    return visiblePayrollRecords.reduce(
      (acc, record) => {
        acc.baseSalary += getBaseSalary(record);
        acc.overtimePay += getOvertimePay(record);
        acc.performanceBonus += getPerformanceBonus(record);
        acc.taxDeductions += getTaxDeductions(record);
        acc.otherDeductions += getOtherDeductions(record);
        acc.netPay += getNetPay(record);

        return acc;
      },
      {
        baseSalary: 0,
        overtimePay: 0,
        performanceBonus: 0,
        taxDeductions: 0,
        otherDeductions: 0,
        netPay: 0,
      }
    );
  }, [visiblePayrollRecords]);

  const ytdGross =
    ytdSummary.baseSalary +
    ytdSummary.overtimePay +
    ytdSummary.performanceBonus;

  const ytdDeductions =
    ytdSummary.taxDeductions +
    ytdSummary.otherDeductions;

  /*
   * HR overview metrics.
   */
  const adminMetrics = useMemo(() => {
    const uniqueEmployees = new Set();

    visiblePayrollRecords.forEach((record) => {
      const id = getEmpId(record);

      if (id) {
        uniqueEmployees.add(String(id));
      }
    });

    const totalPayroll = visiblePayrollRecords.reduce(
      (sum, record) => sum + getNetPay(record),
      0
    );

    const totalOvertime = visiblePayrollRecords.reduce(
      (sum, record) => sum + getOvertimePay(record),
      0
    );

    const totalBonus = visiblePayrollRecords.reduce(
      (sum, record) => sum + getPerformanceBonus(record),
      0
    );

    const totalDeductions = visiblePayrollRecords.reduce(
      (sum, record) =>
        sum + getTaxDeductions(record) + getOtherDeductions(record),
      0
    );

    return {
      employeeCount: uniqueEmployees.size,
      totalPayroll,
      totalOvertime,
      totalBonus,
      totalDeductions,
      recordCount: visiblePayrollRecords.length,
    };
  }, [visiblePayrollRecords]);

  /*
   * Previous payroll period comparison.
   */
  const payrollChange = useMemo(() => {
    if (sortedPayrollRecords.length < 2) {
      return null;
    }

    const current = getNetPay(sortedPayrollRecords[0]);
    const previous = getNetPay(sortedPayrollRecords[1]);

    if (!previous) {
      return null;
    }

    return ((current - previous) / previous) * 100;
  }, [sortedPayrollRecords]);

  /*
   * Animate current net pay.
   */
  useEffect(() => {
    const targetValue = Number(currentPeriod.netPay || 0);

    if (!targetValue) {
      setAnimatedNetPay(0);
      return undefined;
    }

    let frameId = null;
    const startTime = performance.now();
    const duration = 700;

    const animate = (now) => {
      const progress = Math.min(
        (now - startTime) / duration,
        1
      );

      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedNetPay(
        Math.round(targetValue * eased)
      );

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [currentPeriod.netPay]);

  const payrollPeriodLabel = latestRecord
    ? getPayrollMonth(latestRecord)
    : 'Current Payroll Period';

  const employeeName = currentEmpName || 'Employee';
  const greeting = getTimeGreeting(employeeName);
  const currentDateLabel = getCurrentDateLabel();
  const currentTimeLabel = getCurrentTimeLabel();

  /*
   * Download payslip.
   */
  const handleDownloadPayslip = async (record) => {
    try {
      setDownloadLoading(true);

      const empId = getEmpId(record);
      const month = getPayrollMonth(record);

      if (!empId) {
        alert(
          'Unable to determine employee ID for this payslip.'
        );
        return;
      }

      const blob = await api.downloadPayslip(
        empId,
        month
      );

      const url = window.URL.createObjectURL(blob);

      const filename =
        `Nexus_Payslip_${empId}_${String(month).replace(
          /\s+/g,
          '_'
        )}.pdf`;

      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        'Payslip download failed',
        error
      );

      alert(
        'Failed to download payslip. Please try again or contact support.'
      );
    } finally {
      setDownloadLoading(false);
    }
  };

  /*
   * Print payslip modal.
   */
  const handlePrintPayslip = () => {
    window.print();
  };

  /*
   * Escape key closes payslip.
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedPayslip(null);
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* ============================================================
          HERO
      ============================================================ */}
      <div className="payroll-hero relative overflow-hidden rounded-[24px] border border-indigo-200/60 bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-950 p-4 text-white shadow-[0_20px_60px_-30px_rgba(79,70,229,0.8)] dark:border-indigo-900/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(147,197,253,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.14),_transparent_25%)]" />

        <div className="relative z-10 grid gap-4 xl:grid-cols-[1.5fr_0.85fr] xl:items-end">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-100 backdrop-blur-sm">
              <Banknote className="h-3.5 w-3.5" />
              Payroll & Compensation
            </div>

            <div className="space-y-2">
              <h2 className="text-[1.75rem] font-bold tracking-[-0.04em] text-white sm:text-[2.1rem]">
                {greeting}
              </h2>

              <p className="max-w-xl text-sm text-indigo-100/80">
                Track salary, earnings, deductions,
                payroll history and payslips in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] text-indigo-100/80">
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
                {currentEmpId
                  ? `Employee ID • ${currentEmpId}`
                  : isHrAdmin
                    ? 'HR Administration'
                    : 'Employee profile'}
              </span>

              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
                {currentDateLabel}
              </span>

              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                {payrollPeriodLabel}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-100/70">
                Current time
              </div>

              <div className="mt-1 flex items-center gap-2 text-lg font-bold text-white">
                <Clock3 className="h-4 w-4 text-indigo-300" />
                {currentTimeLabel}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-100/70">
                Payroll status
              </div>

              <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                {getPayrollStatus(latestRecord)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          HR ADMIN KPI STRIP
      ============================================================ */}
      {isHrAdmin && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="payroll-card rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Employees
              </span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>

            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {formatNumber(adminMetrics.employeeCount)}
            </div>
          </div>

          <div className="payroll-card rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Net Payroll
              </span>
              <CircleDollarSign className="h-4 w-4 text-emerald-500" />
            </div>

            <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-300">
              {formatMoney(adminMetrics.totalPayroll)}
            </div>
          </div>

          <div className="payroll-card rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Overtime
              </span>
              <Clock3 className="h-4 w-4 text-indigo-500" />
            </div>

            <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-300">
              {formatMoney(adminMetrics.totalOvertime)}
            </div>
          </div>

          <div className="payroll-card rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Bonuses
              </span>
              <Gift className="h-4 w-4 text-emerald-500" />
            </div>

            <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-300">
              {formatMoney(adminMetrics.totalBonus)}
            </div>
          </div>

          <div className="payroll-card rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Deductions
              </span>
              <ReceiptText className="h-4 w-4 text-rose-500" />
            </div>

            <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-300">
              {formatMoney(adminMetrics.totalDeductions)}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          CURRENT PAYROLL
      ============================================================ */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="payroll-card rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Current Net Pay
              </div>

              <div className="payroll-value mt-2 text-4xl font-black tracking-[-0.05em] text-slate-900 dark:text-white md:text-5xl">
                {formatMoney(animatedNetPay)}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                  {payrollPeriodLabel}
                </span>

                {payrollChange !== null && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      payrollChange >= 0
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}
                  >
                    {payrollChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(payrollChange).toFixed(1)}%
                    vs previous
                  </span>
                )}
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusClasses(
                getPayrollStatus(latestRecord)
              )}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {getPayrollStatus(latestRecord)}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-[16px] bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Base
              </div>
              <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                {formatMoney(currentPeriod.baseSalary)}
              </div>
            </div>

            <div className="rounded-[16px] bg-indigo-50 p-3 dark:bg-indigo-950/40">
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-indigo-600 dark:text-indigo-300">
                Overtime
              </div>
              <div className="mt-1 text-sm font-black text-indigo-700 dark:text-indigo-200">
                {formatMoney(currentPeriod.overtimePay)}
              </div>
            </div>

            <div className="rounded-[16px] bg-emerald-50 p-3 dark:bg-emerald-950/30">
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-300">
                Bonus
              </div>
              <div className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-200">
                {formatMoney(currentPeriod.performanceBonus)}
              </div>
            </div>

            <div className="rounded-[16px] bg-rose-50 p-3 dark:bg-rose-950/30">
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-rose-600 dark:text-rose-300">
                Deductions
              </div>
              <div className="mt-1 text-sm font-black text-rose-700 dark:text-rose-200">
                -{formatMoney(currentPeriod.totalDeductions)}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            YTD SUMMARY
        ============================================================ */}
        <div className="payroll-card rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Year to Date
              </div>

              <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Payroll summary
              </h3>
            </div>

            <CalendarDays className="h-4 w-4 text-indigo-500" />
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-[16px] bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="text-xs text-slate-500">
                Gross earnings
              </span>

              <span className="font-black text-slate-900 dark:text-white">
                {formatMoney(ytdGross)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[16px] bg-rose-50 p-3 dark:bg-rose-950/20">
              <span className="text-xs text-rose-600 dark:text-rose-300">
                Total deductions
              </span>

              <span className="font-black text-rose-700 dark:text-rose-300">
                -{formatMoney(ytdDeductions)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[16px] bg-emerald-50 p-3 dark:bg-emerald-950/20">
              <span className="text-xs text-emerald-600 dark:text-emerald-300">
                Net payroll
              </span>

              <span className="font-black text-emerald-700 dark:text-emerald-300">
                {formatMoney(ytdSummary.netPay)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-slate-200 p-3 dark:border-slate-700">
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Overtime YTD
                </div>

                <div className="mt-1 font-black text-indigo-600 dark:text-indigo-300">
                  {formatMoney(ytdSummary.overtimePay)}
                </div>
              </div>

              <div className="rounded-[16px] border border-slate-200 p-3 dark:border-slate-700">
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Bonus YTD
                </div>

                <div className="mt-1 font-black text-emerald-600 dark:text-emerald-300">
                  {formatMoney(ytdSummary.performanceBonus)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          CURRENT PAYROLL BREAKDOWN
      ============================================================ */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="payroll-card rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Breakdown
              </div>

              <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Earnings & deductions
              </h3>
            </div>

            <div className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {payrollPeriodLabel}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Earnings
                </span>

                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {formatMoney(currentPeriod.grossPay)}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>Base salary</span>
                  <span className="font-semibold">
                    {formatMoney(currentPeriod.baseSalary)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>Overtime pay</span>
                  <span className="font-semibold">
                    {formatMoney(currentPeriod.overtimePay)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-700 dark:text-slate-200">
                  <span>Performance bonus</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                    +{formatMoney(currentPeriod.performanceBonus)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-rose-100 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600 dark:text-rose-300">
                  Deductions
                </span>

                <span className="text-sm font-black text-rose-700 dark:text-rose-300">
                  -{formatMoney(currentPeriod.totalDeductions)}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <div className="flex justify-between">
                  <span>Income tax</span>
                  <span className="font-semibold text-rose-600">
                    -{formatMoney(currentPeriod.taxDeductions)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Other deductions</span>
                  <span className="font-semibold text-rose-600">
                    -{formatMoney(currentPeriod.otherDeductions)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] bg-indigo-50 p-4 dark:bg-indigo-950/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-200">
                  Net pay
                </span>

                <span className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                  {formatMoney(currentPeriod.netPay)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            METRIC CARDS
        ============================================================ */}
        <div className="payroll-card rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Metrics
              </div>

              <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Payroll insights
              </h3>
            </div>

            <Calculator className="h-4 w-4 text-indigo-500" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="rounded-[18px] border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Gross earnings
                </span>

                <Banknote className="h-4 w-4 text-slate-400" />
              </div>

              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {formatMoney(currentPeriod.grossPay)}
              </div>
            </div>

            <div className="rounded-[18px] border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
                  Overtime earnings
                </span>

                <Clock3 className="h-4 w-4 text-indigo-500" />
              </div>

              <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-300">
                {formatMoney(currentPeriod.overtimePay)}
              </div>
            </div>

            <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                  Net pay
                </span>

                <CircleDollarSign className="h-4 w-4 text-emerald-500" />
              </div>

              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-300">
                {formatMoney(currentPeriod.netPay)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          PAYROLL HISTORY
      ============================================================ */}
      <div className="payroll-card rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              History
            </div>

            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              Payroll history
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {filteredPayrollRecords.length} of{' '}
              {visiblePayrollRecords.length} records
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder={
                  isHrAdmin
                    ? 'Search employee...'
                    : 'Search payroll...'
                }
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-950 sm:w-52"
              />
            </div>

            {/* Month */}
            <select
              value={monthFilter}
              onChange={(event) =>
                setMonthFilter(event.target.value)
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Months</option>

              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Status</option>
              <option value="Processed">Processed</option>
              <option value="Paid">Paid</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Draft">Draft</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value)
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="latest">Latest First</option>
              <option value="netHigh">Highest Net Pay</option>
              <option value="netLow">Lowest Net Pay</option>
              <option value="salaryHigh">Highest Salary</option>
              <option value="salaryLow">Lowest Salary</option>
            </select>
          </div>
        </div>

        {payrollLoading && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
            Loading payroll records...
          </div>
        )}

        {!payrollLoading && payrollError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
            {payrollError}
          </div>
        )}

        {!payrollLoading &&
          !payrollError &&
          filteredPayrollRecords.length === 0 && (
            <div className="mt-4 rounded-[18px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/40">
              <ReceiptText className="mx-auto h-8 w-8 text-slate-400" />

              <div className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                No payroll records found
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Try changing your search or filters.
              </div>
            </div>
          )}

        {!payrollLoading &&
          !payrollError &&
          filteredPayrollRecords.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                    <th className="px-2 py-3 font-bold uppercase tracking-[0.14em]">
                      Payroll Month
                    </th>

                    {isHrAdmin && (
                      <th className="px-2 py-3 font-bold uppercase tracking-[0.14em]">
                        Employee
                      </th>
                    )}

                    <th className="px-2 py-3 font-bold uppercase tracking-[0.14em]">
                      Base Salary
                    </th>

                    <th className="px-2 py-3 font-bold uppercase tracking-[0.14em]">
                      Overtime
                    </th>

                    <th className="px-2 py-3 font-bold uppercase tracking-[0.14em]">
                      Bonus
                    </th>

                    <th className="px-2 py-3 font-bold uppercase tracking-[0.14em]">
                      Deductions
                    </th>

                    <th className="px-2 py-3 font-bold uppercase tracking-[0.14em]">
                      Net Pay
                    </th>

                    <th className="px-2 py-3 font-bold uppercase tracking-[0.14em]">
                      Status
                    </th>

                    <th className="px-2 py-3 text-right font-bold uppercase tracking-[0.14em]">
                      Payslip
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPayrollRecords.map((record) => {
                    const monthDisplay =
                      getPayrollMonth(record);

                    const baseSalary =
                      getBaseSalary(record);

                    const overtimePay =
                      getOvertimePay(record);

                    const performanceBonus =
                      getPerformanceBonus(record);

                    const totalDeductions =
                      getTaxDeductions(record) +
                      getOtherDeductions(record);

                    const netPay =
                      getNetPay(record);

                    const status =
                      getPayrollStatus(record);

                    const employeeId =
                      getEmpId(record);

                    const employeeName =
                      getEmployeeName(record);

                    return (
                      <tr
                        key={
                          record?.id ||
                          record?._id ||
                          `${employeeId || 'unknown'}-${monthDisplay}`
                        }
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-2 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {monthDisplay}
                          </div>
                        </td>

                        {isHrAdmin && (
                          <td className="px-2 py-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {employeeName}
                            </div>

                            <div className="mt-0.5 text-[10px] text-slate-500">
                              {employeeId || 'No ID'}
                            </div>
                          </td>
                        )}

                        <td className="px-2 py-3 text-slate-700 dark:text-slate-200">
                          {formatMoney(baseSalary)}
                        </td>

                        <td className="px-2 py-3 text-indigo-600 dark:text-indigo-300">
                          {formatMoney(overtimePay)}
                        </td>

                        <td className="px-2 py-3 font-semibold text-emerald-600 dark:text-emerald-300">
                          +{formatMoney(performanceBonus)}
                        </td>

                        <td className="px-2 py-3 font-medium text-rose-600 dark:text-rose-300">
                          -{formatMoney(totalDeductions)}
                        </td>

                        <td className="px-2 py-3 font-black text-slate-900 dark:text-white">
                          {formatMoney(netPay)}
                        </td>

                        <td className="px-2 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${statusClasses(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-2 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPayslip(record)
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* ============================================================
          PAYSLIP MODAL
      ============================================================ */}
      {selectedPayslip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm print:bg-white"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPayslip(null);
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-[24px] bg-white shadow-2xl dark:bg-slate-900 dark:text-white print:max-w-none print:rounded-none print:shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
                  Payslip
                </div>

                <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  NEXUS ENTERPRISE
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Payroll statement •{' '}
                  {getPayrollMonth(selectedPayslip)}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPayslip(null)
                }
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 print:hidden"
                aria-label="Close payslip"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-5 print:max-h-none print:overflow-visible">
              {/* Employee details */}
              <div className="grid grid-cols-1 gap-3 rounded-[18px] bg-slate-50 p-4 sm:grid-cols-3 dark:bg-slate-800/60">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Employee
                  </span>

                  <span className="mt-1 block text-sm font-bold text-slate-900 dark:text-white">
                    {getEmployeeName(selectedPayslip)}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Employee ID
                  </span>

                  <span className="mt-1 block text-sm font-bold text-slate-900 dark:text-white">
                    {getEmpId(selectedPayslip) || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Designation
                  </span>

                  <span className="mt-1 block text-sm font-bold text-slate-900 dark:text-white">
                    {getDesignation(selectedPayslip)}
                  </span>
                </div>
              </div>

              {/* Earnings */}
              <div className="mt-5">
                <div className="mb-2 border-b border-slate-200 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:border-slate-700 dark:text-emerald-300">
                  Earnings
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">
                      Base Salary
                    </span>

                    <span className="font-semibold">
                      {formatMoney(
                        getBaseSalary(selectedPayslip)
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">
                      Overtime Pay
                    </span>

                    <span className="font-semibold">
                      {formatMoney(
                        getOvertimePay(selectedPayslip)
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">
                      Performance Bonus
                    </span>

                    <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                      +{formatMoney(
                        getPerformanceBonus(selectedPayslip)
                      )}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 font-black dark:border-slate-800">
                    <span>Gross Earnings</span>

                    <span>
                      {formatMoney(
                        getBaseSalary(selectedPayslip) +
                          getOvertimePay(selectedPayslip) +
                          getPerformanceBonus(selectedPayslip)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="mt-5">
                <div className="mb-2 border-b border-slate-200 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-600 dark:border-slate-700 dark:text-rose-300">
                  Deductions
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">
                      Income Tax
                    </span>

                    <span className="font-semibold text-rose-600">
                      -{formatMoney(
                        getTaxDeductions(selectedPayslip)
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">
                      Other Deductions
                    </span>

                    <span className="font-semibold text-rose-600">
                      -{formatMoney(
                        getOtherDeductions(selectedPayslip)
                      )}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 font-black dark:border-slate-800">
                    <span>Total Deductions</span>

                    <span className="text-rose-600">
                      -{formatMoney(
                        getTaxDeductions(selectedPayslip) +
                          getOtherDeductions(selectedPayslip)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net pay */}
              <div className="mt-5 rounded-[20px] bg-indigo-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-100">
                      Total Net Pay
                    </div>

                    <div className="mt-1 text-2xl font-black">
                      {formatMoney(
                        getNetPay(selectedPayslip)
                      )}
                    </div>
                  </div>

                  <CheckCircle2 className="h-7 w-7 text-indigo-200" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-5 dark:border-slate-800 print:hidden">
              <button
                type="button"
                onClick={handlePrintPayslip}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDownloadPayslip(
                    selectedPayslip
                  )
                }
                disabled={downloadLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />

                {downloadLoading
                  ? 'Downloading...'
                  : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;
