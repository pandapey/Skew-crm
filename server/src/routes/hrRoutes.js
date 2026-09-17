import { Router } from 'express'
import * as M from '../models/hrModels.js'
import { Employee } from '../models/Employee.js'
import { AuditLog } from '../models/adminModels.js'
import { attendanceService } from '../services/attendanceService.js'
import { computePayroll, fillPayrollGaps, comparePayrollMonthDesc, parsePayrollMonth } from '../services/payrollEngine.js'
import { getPayrollSettings, savePayrollSettings } from '../services/payrollSettings.js'
import { createResourceService } from '../services/resourceFactory.js'
import { buildResourceRouter } from './resourceRouter.js'
import { validators } from '../validators/hrValidators.js'
import { asyncHandler, ApiError } from '../utils/asyncHandler.js'
import { audit } from '../utils/password.js'
import { protect, blockClient, authorize } from '../middleware/auth.js'
import { buildClientBillingOverview } from '../services/clientBillingService.js'

const SALARY_PORTAL_CONTEXT = 'salary-portal'
const SALARY_PORTAL_ACTION = 'Viewed salary portal'
const SALARY_PORTAL_AUDIT_WINDOW_MS = 15 * 60 * 1000

const refDataRead = authorize('Admin', 'Manager')

const payrollConfigWrite = authorize('Admin', 'Manager')

const router = Router()

router.use(protect, blockClient)

const employeeCountsBy = async (field) => {
  const rows = await Employee.aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }])
  return new Map(rows.map((r) => [String(r._id ?? ''), r.n]))
}
const withLiveHeadcount = (created, { field, key, pick }) => {
  const service = created.service
  const base = {
    list: service.list.bind(service),
    all: service.all.bind(service),
    get: service.get.bind(service),
  }
  return {
    ...created,
    service: {
      ...service,
      async list(query) {
        const result = await base.list(query)
        const counts = await employeeCountsBy(field)
        result.data = result.data.map((d) => ({ ...d, [key]: counts.get(String(pick(d))) ?? 0 }))
        return result
      },
      async all() {
        const counts = await employeeCountsBy(field)
        return (await base.all()).map((d) => ({ ...d, [key]: counts.get(String(pick(d))) ?? 0 }))
      },
      async get(id) {
        const doc = await base.get(id)
        const counts = await employeeCountsBy(field)
        return { ...doc, [key]: counts.get(String(pick(doc))) ?? 0 }
      },
    },
  }
}

const departments = withLiveHeadcount(createResourceService(M.Department, { searchFields: ['name', 'code', 'head'], filterFields: ['status'] }), { field: 'department', key: 'headcount', pick: (d) => d.name })
const designations = withLiveHeadcount(createResourceService(M.Designation, { searchFields: ['title', 'department'], filterFields: ['department'] }), { field: 'designation', key: 'count', pick: (d) => d.title })
const jobs = createResourceService(M.JobOpening, { searchFields: ['title', 'department', 'location'], filterFields: ['department', 'status'] })
const candidates = createResourceService(M.Candidate, { searchFields: ['name', 'position', 'email'], filterFields: ['stage', 'source'] })
const interviews = createResourceService(M.Interview, { searchFields: ['candidate', 'position', 'interviewer'], filterFields: ['status', 'round'] })
const offers = createResourceService(M.Offer, { searchFields: ['candidate', 'position'], filterFields: ['status'] })
const onboarding = createResourceService(M.Onboarding, { searchFields: ['name', 'position'], filterFields: ['department'] })
const payroll = createResourceService(M.Payroll, { searchFields: ['employee', 'empCode', 'department'], filterFields: ['department', 'status'] })
const reviews = createResourceService(M.Review, { searchFields: ['employee', 'department', 'employeeCode'], filterFields: ['department', 'status', 'employee'] })
const movements = createResourceService(M.Movement, { searchFields: ['employee', 'type', 'department'], filterFields: ['type', 'status'] })

const selfPayrollFilter = (user) => (user.empCode ? { empCode: user.empCode } : { employee: user.name })

router.get('/payroll-settings', protect, payrollConfigWrite, asyncHandler(async (req, res) => {
  res.json(await getPayrollSettings())
}))
router.put('/payroll-settings', protect, payrollConfigWrite, asyncHandler(async (req, res) => {
  const saved = await savePayrollSettings(req.body || {})
  await audit(req.user?.name || 'System', 'Updated payroll settings', {
    module: 'Payroll',
    severity: 'Warning',
    ip: req.ip,
  })
  res.json(saved)
}))

router.get('/payroll/me', protect, asyncHandler(async (req, res) => {

  const rows = (await M.Payroll.find(selfPayrollFilter(req.user)).lean())
    .sort(comparePayrollMonthDesc)
    .slice(0, 12)

  res.json(rows.map((r) => ({ ...r, id: String(r._id) })))
}))

router.get('/payroll/me/salary', protect, asyncHandler(async (req, res) => {
  const user = req.user

  const payrollRows = (await M.Payroll.find(selfPayrollFilter(user)).lean())
    .sort(comparePayrollMonthDesc)
    .slice(0, 24)

  const paymentDateOf = (r) => r.payment_date || (r.status === 'Paid' ? r.updatedAt : null)

  const emp = await Employee.findOne({
    $or: [
      ...(user._id ? [{ userId: user._id }] : []),
      ...(user.empCode ? [{ empCode: user.empCode }] : []),
      { name: user.name },
    ],
  }).lean()
  const struct = emp?.salary || null

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const attendance = await attendanceService.mySummary(
    user,
    { year: currentYear, month: currentMonth }
  )

  const latest = payrollRows[0] || null
  const latestIsCurrentPeriod = latest != null
    && parsePayrollMonth(latest.month)?.year === currentYear
    && parsePayrollMonth(latest.month)?.month === currentMonth
  let current
  if (latest && latestIsCurrentPeriod) {

    const rateBasis = (struct && (struct.basic || struct.ctc))
      ? struct
      : { basic: latest.basic, monthly: latest.monthly, pf: latest.pf, esi: latest.esi }
    const computed = computePayroll(rateBasis, attendance)
    const merged = fillPayrollGaps({
      basic: latest.basic,
      pf: latest.pf, esi: latest.esi,
      other_deductions: latest.other_deductions,
      bonus: latest.bonus,
      daily_rate: latest.daily_rate, hourly_rate: latest.hourly_rate,
      lwp_days: latest.lwp_days,
    }, computed)

    current = {
      month: latest.month,
      monthly: merged.monthly,
      basic: merged.basic,
      daily_rate: merged.daily_rate,
      hourly_rate: merged.hourly_rate,
      daily_payable_rate: merged.daily_payable_rate,
      daily_payable_amount: merged.daily_payable_amount,
      net_monthly_salary: merged.net_monthly_salary,
      scheduled_working_days: computed.scheduled_working_days,
      present_days: computed.present_days,
      paid_leave_days: computed.paid_leave_days,
      payable_days: merged.payable_days,
      overtime_hours: merged.overtime_hours,
      overtime_hours_raw: computed.overtime_hours_raw,
      overtime_rate: merged.overtime_rate,
      overtime_rate_source: computed.overtime_rate_source,
      overtime_pay: merged.overtime_pay,
      lwp_days: merged.lwp_days,
      lwp_deduction: merged.lwp_deduction,
      payable_gross: merged.payable_gross,
      late_days: attendance?.lateDays ?? 0,
      bonus: merged.bonus,
      gross: merged.gross,
      pf: merged.pf,
      esi: merged.esi,
      other_deductions: merged.other_deductions,
      totalDeductions: merged.total_deductions,
      net: merged.net,
      status: latest.status || 'Pending',
      paymentDate: paymentDateOf(latest),
      receivable: merged.receivable,
      current_receivable: merged.current_receivable,
      receivable_total: merged.receivable_total,
      source: 'payroll',
    }
  } else if (struct && (struct.basic || struct.ctc)) {
    const computed = computePayroll(struct, attendance)
    current = {
      month: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      monthly: computed.monthly,
      basic: computed.basic,
      daily_rate: computed.dailyRate,
      hourly_rate: computed.hourlyRate,
      daily_payable_rate: computed.daily_payable_rate,
      daily_payable_amount: computed.daily_payable_amount,
      net_monthly_salary: computed.net_monthly_salary,
      scheduled_working_days: computed.scheduled_working_days,
      present_days: computed.present_days,
      paid_leave_days: computed.paid_leave_days,
      payable_days: computed.payable_days,
      overtime_hours: computed.overtime_hours,
      overtime_hours_raw: computed.overtime_hours_raw,
      overtime_rate: computed.overtime_rate,
      overtime_rate_source: computed.overtime_rate_source,
      overtime_pay: computed.overtime_pay,
      lwp_days: computed.lwp_days,
      lwp_deduction: computed.lwp_deduction,
      payable_gross: computed.payable_gross,
      late_days: attendance?.lateDays ?? 0,
      bonus: computed.bonus,
      gross: computed.gross,
      pf: computed.pf,
      esi: computed.esi,
      other_deductions: computed.other_deductions,
      totalDeductions: computed.total_deductions,
      net: computed.net,
      status: 'Not Processed',
      paymentDate: null,
      receivable: computed.receivable,
      current_receivable: computed.current_receivable,
      receivable_total: computed.receivable_total,
      source: 'computed',
    }
  } else {
    current = null
  }

  const history = payrollRows.map((r) => {
    const isCurrent = current?.source === 'payroll' && String(r._id) === String(latest._id)
    const gross = isCurrent
      ? current.gross
      : (r.gross ?? ((r.basic || 0) + (r.hra || 0) + (r.allowances || 0) + (r.overtime_pay || 0) + (r.bonus || 0)))
    const deductions = isCurrent
      ? current.totalDeductions
      : (r.total_deductions
        || ((r.pf || 0) + (r.tax || 0) + (r.esi || 0) + (r.professional_tax || 0)
          + (r.other_deductions || 0) + (r.lwp_deduction || 0)))
    const net = isCurrent ? current.net : (r.net ?? Math.max(0, gross - deductions))
    return {
      id: String(r._id),
      month: r.month,
      basic: r.basic || 0,
      gross,
      pf: r.pf || 0,
      tax: r.tax || 0,
      deductions,
      net,
      status: r.status || 'Pending',
      paymentDate: paymentDateOf(r),
    }
  })

  if (String(req.query.context || '') === SALARY_PORTAL_CONTEXT) {
    const since = new Date(Date.now() - SALARY_PORTAL_AUDIT_WINDOW_MS)
    const already = await AuditLog.exists({
      user: user.name || 'Unknown',
      action: SALARY_PORTAL_ACTION,
      at: { $gte: since },
    })
    if (!already) {
      await audit(user.name || 'Unknown', SALARY_PORTAL_ACTION, {
        user: user.name || 'Unknown',
        module: 'Payroll',
        severity: 'Info',
        ip: req.ip,
      })
    }
  }

  res.json({
    identity: {
      name: emp?.name || user.name,
      empCode: emp?.empCode || user.empCode || null,
      department: emp?.department || user.department || null,
      designation: emp?.designation || null,
      ctc: struct?.ctc || 0,
      monthly: struct?.monthly || (struct?.ctc ? Math.round(struct.ctc / 12) : 0),
      bank: emp?.bank
        ? { name: emp.bank.name || '', account: emp.bank.account || '', ifsc: emp.bank.ifsc || '' }
        : null,
    },
    current,
    attendance,
    history,
    meta: {
      esiTracked: true,
      otherDeductionsTracked: true,
      professionalTaxTracked: false,
      incomeTaxTracked: false,
      lwpDeductionTracked: true,
      removedDeductions: ['professional_tax', 'tax'],
      paymentDateSource: 'Payroll.payment_date or updatedAt when Paid',
      salarySource: current?.source || 'none',
      attendanceBasis: {
        from: attendance?.from ?? null,
        to: attendance?.to ?? null,
        expectedWorkingDays: attendance?.expectedWorkingDays ?? 0,
        elapsedWorkingDays: attendance?.elapsedWorkingDays ?? 0,
        companyHolidays: attendance?.holidayDays ?? 0,
        presentDays: attendance?.presentDays ?? 0,
        approvedLeaveDays: attendance?.paidLeaveDays ?? attendance?.leaveDays ?? 0,
        unpaidLeaveDays: attendance?.unpaidLeaveDays ?? 0,
        recordedAbsentDays: attendance?.absentDays ?? 0,
        unrecordedDays: attendance?.unrecordedDays ?? 0,
        payableAbsentDays: attendance?.payableAbsentDays ?? 0,
      },
    },
  })
}))

router.post(
  '/payroll/run',
  payrollConfigWrite,
  asyncHandler(async (req, res) => {
    const { employee, month, bonus, otherDeductions } = req.body
    if (!employee) throw new ApiError(400, 'Employee is required')
    if (!month) throw new ApiError(400, 'Payroll month is required')
    const emp = await Employee.findById(employee).lean()
    if (!emp) throw new ApiError(404, 'Employee not found')

    const existing = await M.Payroll.findOne({ employee: emp.name, month: { $regex: `^${month}$`, $options: 'i' } })
    if (existing) {
      throw new ApiError(409, `Payroll for ${emp.name} (${month}) already exists.`)
    }

    const parsed = parsePayrollMonth(month)

    if (emp.joiningDate && parsed.year != null) {
      const join = new Date(emp.joiningDate)
      if (parsed.year * 12 + parsed.month < join.getFullYear() * 12 + join.getMonth()) {
        const joinLabel = join.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        throw new ApiError(400, `Payroll for ${emp.name} cannot run for ${month} — it is before their joining month (${joinLabel}).`)
      }
    }

    const struct = emp.salary || {}

    let attendance = {}
    if (parsed.year != null) {
      attendance = await attendanceService.mySummary(emp, {
        year: parsed.year, month: parsed.month,
      }) || {}
    }

    const computed = computePayroll(struct, attendance, {
      bonus: Number(bonus) || 0,
      otherDeductions: Number(otherDeductions) || 0,
    })

    const doc = await M.Payroll.create({
      employee: emp.name,
      empCode: emp.empCode || '',
      department: emp.department || '',
      designation: emp.designation || '',
      month,

      monthly: computed.monthly,
      basic: computed.basic,
      pf: computed.pf,
      esi: computed.esi,

      daily_rate: computed.dailyRate,
      hourly_rate: computed.hourlyRate,

      overtime_hours: computed.overtime_hours,
      overtime_pay: computed.overtime_pay,

      lwp_days: computed.lwp_days,
      lwp_deduction: computed.lwp_deduction,

      bonus: computed.bonus,
      other_deductions: computed.other_deductions,

      gross: computed.gross,
      total_deductions: computed.total_deductions,
      net: computed.net,

      working_days: computed.scheduled_working_days,
      present_days: computed.present_days,
      leave_days: computed.paid_leave_days ?? computed.leave_days,
      late_days: attendance?.lateDays ?? 0,
      status: 'Pending',
    })

    const { emitResource } = await import('../realtime/index.js')
    emitResource('hr', 'create', doc)
    emitResource('hr', 'payroll-created', doc)

    res.status(201).json({ ...doc.toObject(), id: String(doc._id) })
  })
)

router.use('/departments', buildResourceRouter(departments.service, { validate: validators.department, readGuard: refDataRead }))
router.use('/designations', buildResourceRouter(designations.service, { validate: validators.designation, readGuard: refDataRead }))
router.use('/jobs', buildResourceRouter(jobs.service, { validate: validators.job }))
router.use('/interviews', buildResourceRouter(interviews.service, { validate: validators.interview }))
router.use('/offers', buildResourceRouter(offers.service, { validate: validators.offer }))
router.use('/onboarding', buildResourceRouter(onboarding.service))
router.use('/payroll', buildResourceRouter(payroll.service))
router.use('/reviews', buildResourceRouter(reviews.service, { validate: validators.review, readGuard: refDataRead }))
router.use('/movements', buildResourceRouter(movements.service, { validate: validators.movement }))

router.use('/candidates', buildResourceRouter(candidates.service, {
  validate: validators.candidate,
  extraRoutes: (r, canWrite) => {
    r.patch('/:id/stage', canWrite, asyncHandler(async (req, res) => {
      res.json(await candidates.service.update(req.params.id, { stage: req.body.stage }))
    }))
  },
}))

router.get('/stats', protect, authorize('Admin', 'Manager'), asyncHandler(async (req, res) => {
  const groupBy = (Model, field) => Model.aggregate([
    { $group: { _id: `$${field}`, value: { $sum: 1 } } },
    { $project: { _id: 0, name: '$_id', value: 1 } },
  ])

  const [depts, headByDept, byStage, openJobs, interviewsScheduled, pendingOffers, onboardingCount, pendingReviews, attrition, payrollAgg] = await Promise.all([
    M.Department.countDocuments(),
    Employee.aggregate([{ $group: { _id: '$department', value: { $sum: 1 } } }, { $project: { _id: 0, name: '$_id', value: 1 } }]),
    groupBy(M.Candidate, 'stage'),
    M.JobOpening.countDocuments({ status: 'Open' }),
    M.Interview.countDocuments({ status: 'Scheduled' }),
    M.Offer.countDocuments({ status: { $in: ['Pending', 'Sent'] } }),
    M.Onboarding.countDocuments(),
    M.Review.countDocuments({ status: { $ne: 'Completed' } }),
    M.Movement.countDocuments({ type: { $in: ['Resignation', 'Exit'] } }),
    M.Payroll.aggregate([{ $group: { _id: null, total: { $sum: '$net' } } }]),
  ])

  const totalHeadcount = await Employee.countDocuments()
  const headByDeptFinal = headByDept.length ? headByDept : (totalHeadcount ? [{ name: 'Unassigned', value: totalHeadcount }] : headByDept)
  res.json({
    totalDepartments: depts,
    totalHeadcount,
    openJobs,
    totalCandidates: byStage.reduce((s, x) => s + x.value, 0),
    interviewsScheduled,
    pendingOffers,
    onboarding: onboardingCount,
    monthlyPayroll: payrollAgg[0]?.total || 0,
    pendingReviews,
    attrition,
    headcountByDept: headByDeptFinal,
    byStage: byStage.filter((s) => s.name !== 'Rejected'),
  })
}))

router.get('/client-billing', protect, authorize('Admin', 'Manager'), asyncHandler(async (req, res) => {
  res.json(await buildClientBillingOverview())
}))

export default router
