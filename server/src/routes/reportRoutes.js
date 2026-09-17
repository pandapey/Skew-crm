import { Router } from 'express'
import { protect, blockClient } from '../middleware/auth.js'
import {
  dashboardReport, employeesReport, attendanceReport, leavesReport,
  financeReport, projectsReport, dashboardStats,
} from '../controllers/reportController.js'

const router = Router()

router.use(protect, blockClient)

router.get('/stats', dashboardStats)

router.get('/dashboard', dashboardReport)
router.get('/employees', employeesReport)
router.get('/attendance', attendanceReport)
router.get('/leaves', leavesReport)
router.get('/finance', financeReport)
router.get('/projects', projectsReport)

export default router
