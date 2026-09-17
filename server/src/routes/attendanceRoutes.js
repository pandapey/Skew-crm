import { Router } from 'express'
import { Shift, Holiday } from '../models/attendanceModels.js'
import { attendanceController as ctrl } from '../controllers/attendanceController.js'
import { createResourceService } from '../services/resourceFactory.js'
import { buildResourceRouter } from './resourceRouter.js'
import { makeValidator } from '../validators/hrValidators.js'
import { protect, authorize, blockClient } from '../middleware/auth.js'

const router = Router()

router.use(protect, blockClient)

const canReport = authorize('Admin', 'Manager')

router.get('/me/summary', protect, ctrl.mySummary)
router.get('/me', protect, ctrl.myHistory)
router.get('/today', protect, ctrl.today)
router.get('/calendar', protect, ctrl.calendar)
router.post('/check-in', protect, ctrl.checkIn)
router.post('/check-out', protect, ctrl.checkOut)
router.post('/break', protect, ctrl.toggleBreak)

router.get('/day', protect, canReport, ctrl.dayRecords)
router.get('/stats', protect, canReport, ctrl.stats)

const shifts = createResourceService(Shift, { searchFields: ['name', 'code'] })
const holidays = createResourceService(Holiday, { searchFields: ['name'], filterFields: ['type'] })
const canReadShifts = authorize('Admin', 'Manager')
router.use('/shifts', buildResourceRouter(shifts.service, {
  validate: makeValidator(['name', 'code', 'start', 'end']),
  readGuard: canReadShifts,
}))

const canReadHolidays = authorize('Admin', 'Manager', 'Employee')
router.use('/holidays', buildResourceRouter(holidays.service, {
  validate: makeValidator(['name', 'date']),
  readGuard: canReadHolidays,
}))

export default router
