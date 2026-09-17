const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

export function parsePayrollMonth(label) {
  if (!label) return { year: null, month: null }
  const text = String(label).trim()
  const iso = /^(\d{4})-(\d{2})/.exec(text)
  if (iso) {
    const m = Number(iso[2]) - 1
    return m >= 0 && m <= 11 ? { year: Number(iso[1]), month: m } : { year: null, month: null }
  }
  const parts = text.split(/\s+/)
  if (parts.length === 2) {
    const idx = MONTH_NAMES.findIndex((m) => m.startsWith(parts[0].toLowerCase()))
    const yr = Number(parts[1])
    if (idx >= 0 && Number.isFinite(yr) && yr > 0) return { year: yr, month: idx }
  }
  return { year: null, month: null }
}

export function comparePayrollMonthDesc(a, b) {
  const pa = parsePayrollMonth(a?.month)
  const pb = parsePayrollMonth(b?.month)
  const ka = pa.year == null ? -Infinity : pa.year * 12 + pa.month
  const kb = pb.year == null ? -Infinity : pb.year * 12 + pb.month
  return kb - ka
}

const WORKING_DAYS_BASIS = 30
const ESI_GROSS_CEILING = 21000
const ESI_EMPLOYEE_RATE = 0.0075

const round2 = (n) => Math.round(n * 100) / 100

export function computePayroll(struct, attendance = {}, opts = {}) {
  const basic = Math.round(struct?.basic || 0)
  const monthly = Math.round(
    struct?.monthly || (basic ? basic / 0.5 : 0) || (struct?.ctc ? struct.ctc / 12 : 0)
  )
  const storedPf = Math.round(struct?.pf || 0)
  const storedEsi = Math.round(struct?.esi || 0)
  const pf = storedPf || Math.round(basic * 0.12)

  const esi = (storedEsi || (monthly <= ESI_GROSS_CEILING ? Math.round(monthly * ESI_EMPLOYEE_RATE) : 0))

  const netMonthlySalary = Math.max(0, monthly - pf - esi)

  const scheduledWorkingDays = WORKING_DAYS_BASIS

  const workingDaysBasis = WORKING_DAYS_BASIS
  const dailyRate = basic > 0 ? round2(basic / workingDaysBasis) : 0
  const hourlyRate = dailyRate > 0 ? round2(dailyRate / 8) : 0

  const dailyPayableRate = scheduledWorkingDays > 0 ? round2(netMonthlySalary / scheduledWorkingDays) : 0

  const dailyPayableAmount = scheduledWorkingDays > 0 ? round2(netMonthlySalary / scheduledWorkingDays) : 0

  const overtimeHours = 0
  const overtimeHoursRaw = 0
  const overtimeRate = 0
  const overtimeRateSource = 'removed'
  const overtimePay = 0

  const lwpDays = Number(opts?.lwpDays ?? attendance?.payableAbsentDays ?? attendance?.absentDays ?? 0)
  const lwpDeduction = Math.round(lwpDays * dailyPayableRate)

  const bonus = Math.round(Number(opts?.bonus || 0))
  const otherDeductions = Math.round(Number(opts?.otherDeductions || 0))

  const payableGross = monthly
  const gross = monthly

  const tax = 0
  const professionalTax = 0

  const totalDeductions = pf + esi + otherDeductions + lwpDeduction
  const net = Math.max(0, monthly - totalDeductions)
  const presentDays = Math.max(0, Number(attendance?.presentDays || 0))
  const paidLeaveDays = Math.max(0, Number(attendance?.paidLeaveDays || 0))
  const payableDays = presentDays + paidLeaveDays
  const receivable = Math.round(dailyPayableAmount * payableDays)
  const currentReceivable = receivable + overtimePay
  const receivableTotal = currentReceivable

  const yearlyNet = net * 12
  const yearlyCTC = (struct?.ctc || monthly * 12)

  return {
    dailyRate,
    hourlyRate,
    daily_payable_rate: dailyPayableRate,
    daily_payable_amount: dailyPayableAmount,
    scheduled_working_days: scheduledWorkingDays,
    present_days: presentDays,
    paid_leave_days: paidLeaveDays,
    payable_days: payableDays,
    monthly,
    basic,
    net_monthly_salary: netMonthlySalary,
    payable_gross: payableGross,
    overtime_hours: overtimeHours,
    overtime_hours_raw: overtimeHoursRaw,
    overtime_rate: overtimeRate,
    overtime_rate_source: overtimeRateSource,
    overtime_pay: overtimePay,
    bonus,
    gross,
    pf,
    esi,
    other_deductions: otherDeductions,
    tax,
    professional_tax: professionalTax,
    lwp_days: lwpDays,
    lwp_deduction: lwpDeduction,
    total_deductions: totalDeductions,
    net,
    receivable,
    current_receivable: currentReceivable,
    receivable_total: receivableTotal,
    yearly_net: yearlyNet,
    yearly_ctc: yearlyCTC,
  }
}

export function fillPayrollGaps(payrollDoc, computed) {
  const fill = (field, value) => {
    if (payrollDoc[field] == null || payrollDoc[field] === 0) payrollDoc[field] = value
  }
  fill('monthly', computed.monthly)
  fill('basic', computed.basic)
  fill('pf', computed.pf)
  fill('esi', computed.esi)
  fill('bonus', computed.bonus)
  fill('daily_rate', computed.dailyRate)
  fill('hourly_rate', computed.hourlyRate)
  fill('other_deductions', computed.other_deductions)

  payrollDoc.overtime_hours = computed.overtime_hours
  payrollDoc.overtime_rate = computed.overtime_rate
  payrollDoc.overtime_pay = computed.overtime_pay

  payrollDoc.tax = 0
  payrollDoc.professional_tax = 0
  fill('lwp_days', computed.lwp_days)
  payrollDoc.lwp_deduction = Math.round((payrollDoc.lwp_days || 0) * (computed.daily_payable_rate || 0))

  const payableGross = payrollDoc.monthly || 0
  payrollDoc.payable_gross = payableGross
  payrollDoc.gross = payableGross

  payrollDoc.total_deductions = (payrollDoc.pf || 0) + (payrollDoc.esi || 0)
    + (payrollDoc.other_deductions || 0) + (payrollDoc.lwp_deduction || 0)
  payrollDoc.net = Math.max(0, payableGross - payrollDoc.total_deductions)

  payrollDoc.net_monthly_salary = Math.max(0, (payrollDoc.monthly || 0) - (payrollDoc.pf || 0) - (payrollDoc.esi || 0))

  payrollDoc.daily_payable_rate = computed.daily_payable_rate
  payrollDoc.daily_payable_amount = computed.daily_payable_amount
  payrollDoc.payable_days = computed.payable_days
  payrollDoc.receivable = computed.receivable
  payrollDoc.current_receivable = computed.current_receivable
  payrollDoc.receivable_total = computed.receivable_total
  return payrollDoc
}
