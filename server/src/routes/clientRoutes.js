import { Router } from 'express'
import { protect, authorize } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../utils/asyncHandler.js'
import { upload } from '../middleware/upload.js'
import * as ctrl from '../controllers/clientController.js'

const router = Router()

router.use(protect, authorize('Client'))

router.get('/profile', ctrl.getProfile)
router.get('/projects', ctrl.getProjects)
router.get('/projects/:id', ctrl.getProject)
router.get('/projects/:id/tasks', ctrl.getProjectSub('tasks'))
router.get('/projects/:id/timeline', ctrl.getProjectSub('timeline'))
router.get('/projects/:id/team', ctrl.getProjectSub('team'))
router.get('/projects/:id/activity', ctrl.getProjectSub('activity'))
router.get('/projects/:id/documents', ctrl.getProjectSub('documents'))
router.get('/projects/:id/payments', ctrl.getProjectSub('payments'))
router.get('/projects/:id/comments', ctrl.getProjectComments)
router.post('/projects/:id/comments', ctrl.addProjectComment)
router.patch('/projects/:id/comments/:commentId', ctrl.updateProjectComment)
router.delete('/projects/:id/comments/:commentId', ctrl.deleteProjectComment)
router.post('/projects/:id/comments/attachments', upload.single('file'), ctrl.uploadCommentAttachment)
router.post('/projects/:id/documents', upload.single('file'), ctrl.uploadClientDocument)
router.delete('/projects/:id/documents/:docId', ctrl.deleteClientDocument)
router.get('/projects/:id/documents/:docId/download', ctrl.downloadClientDocument)
router.get('/projects/:id/task-history', ctrl.getProjectTaskHistory)
router.get('/projects/:id/progress', ctrl.getProjectProgress)

router.get('/tasks', asyncHandler(async (req, res) => {
  const id = req.user.clientId
  if (!id) throw new ApiError(403, 'Your account is not linked to a client')
  const filter = { clientId: id }
  if (req.query.projectId) filter.projectId = req.query.projectId
  const projects = await (await import('../models/clientModels.js')).ClientProject.find(filter).lean()
  const rows = []
  projects.forEach((p) => (p.tasks || []).forEach((t) => rows.push({ ...t, projectId: p.projectId, projectName: p.name, projectCode: p.code })))
  res.json(rows)
}))
router.get('/timeline', ctrl.getAllTimeline)
router.get('/team', ctrl.getAllTeam)
router.get('/activity', ctrl.getAllActivity)
router.get('/documents', ctrl.getAllDocuments)
router.get('/payments', ctrl.getAllPayments)
router.get('/invoices', ctrl.getAllInvoices)
router.get('/holidays', ctrl.getHolidays)
router.get('/meetings', ctrl.getMeetings)
router.post('/meetings', ctrl.createMeetingRequest)
router.patch('/meetings/:id/status', ctrl.respondToMeeting)
router.patch('/meetings/:id/reschedule', ctrl.rescheduleMeetingAsClient)
router.get('/notifications', ctrl.getNotifications)
router.post('/notifications/read-all', ctrl.markAllNotificationsRead)
router.patch('/notifications/:id/read', ctrl.markNotificationRead)

export const adminClientRouter = Router()

adminClientRouter.use(protect, authorize('Admin', 'Manager'))

const clientWrite = authorize('Admin', 'Manager')
const adminOnly = authorize('Admin')

adminClientRouter.get('/clients', ctrl.listClients)
adminClientRouter.get('/projects', adminOnly, ctrl.listAllProjects)
adminClientRouter.get('/clients/:id', ctrl.getClient)
adminClientRouter.post('/clients', clientWrite, ctrl.createClient)
adminClientRouter.put('/clients/:id', clientWrite, ctrl.updateClient)
adminClientRouter.delete('/clients/:id', adminOnly, ctrl.removeClient)
adminClientRouter.post('/clients/:id/projects', adminOnly, ctrl.assignProject)
adminClientRouter.put('/projects/:id/manager', adminOnly, ctrl.assignProjectManager)
adminClientRouter.put('/projects/:id/team', adminOnly, ctrl.assignTeam)
adminClientRouter.put('/projects/:id/progress', adminOnly, ctrl.updateProjectProgress)
adminClientRouter.post('/projects/:id/invoices', adminOnly, ctrl.generateInvoice)
adminClientRouter.put('/projects/:id/payments/:paymentId', adminOnly, ctrl.updatePayment)
adminClientRouter.post('/projects/:id/documents', adminOnly, ctrl.uploadDocument)
adminClientRouter.post('/announcements', adminOnly, ctrl.publishAnnouncement)
adminClientRouter.get('/clients/:id/messages', adminOnly, ctrl.adminListMessages)
adminClientRouter.post('/messages/:id/reply', adminOnly, ctrl.adminReplyMessage)

export default router
