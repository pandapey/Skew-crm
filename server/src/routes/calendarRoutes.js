import { Router } from 'express'
import { calendarController as ctrl } from '../controllers/calendarController.js'
import { protect, authorize, blockClient } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
const canWrite = authorize('Admin', 'Manager')

router.use(protect, blockClient)
router.get('/', asyncHandler(ctrl.list))
router.get('/range', asyncHandler(ctrl.range))
router.get('/:id', asyncHandler(ctrl.get))

router.post('/', asyncHandler(ctrl.create))
router.put('/:id', canWrite, asyncHandler(ctrl.update))
router.patch('/:id/done', canWrite, asyncHandler(ctrl.toggleDone))
router.patch('/:id/meeting-status', asyncHandler(ctrl.updateMeetingStatus))
router.patch('/:id/reschedule', asyncHandler(ctrl.rescheduleMeeting))
router.delete('/:id', canWrite, asyncHandler(ctrl.remove))

export default router
