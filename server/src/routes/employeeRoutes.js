import { Router } from 'express'
import { employeeController as ctrl } from '../controllers/employeeController.js'
import { validateEmployeeUpdate } from '../validators/employeeValidator.js'
import { protect, authorize } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { createUser } from '../controllers/userController.js'
import { upload, uploadImage, uploadProfileDoc } from '../middleware/upload.js'

const router = Router()
const canWrite = authorize('Admin', 'Manager')
const canBulkWrite = authorize('Admin', 'Manager')
const canDelete = authorize('Admin')
const IMMUTABLE_FIELDS = ['empCode', 'userId', '_id', 'id', 'createdAt', 'updatedAt']

const restrictEmployeeFields = (req, res, next) => {
  const body = { ...(req.body || {}) }
  for (const key of IMMUTABLE_FIELDS) delete body[key]
  req.body = body
  next()
}

const blockClient = (req, res, next) =>
  req.user.role === 'Client'
    ? res.status(403).json({ message: 'Forbidden: clients cannot access employee records' })
    : next()
router.use(protect, blockClient)

router.get('/', ctrl.list)
router.get('/stats', ctrl.stats)
router.get('/me', ctrl.myProfile)

const onlyEmployee = authorize('Employee')

router.put('/me', authorize('Employee', 'Manager'), asyncHandler(ctrl.updateSelf))
router.post('/me/documents', onlyEmployee, uploadProfileDoc.single('document'), asyncHandler(ctrl.uploadSelfDocument))
router.get('/me/documents/:docId', onlyEmployee, asyncHandler(ctrl.downloadSelfDocument))
router.delete('/me/documents/:docId', onlyEmployee, asyncHandler(ctrl.deleteSelfDocument))

router.get('/:id', ctrl.get)

router.post('/bulk-delete', canDelete, ctrl.bulkRemove)
router.post('/bulk-update', canBulkWrite, ctrl.bulkUpdate)

const canCreate = authorize('Admin', 'Manager')

const forceEmployeeRole = (req, res, next) => {
  req.body = { ...(req.body || {}), role: 'Employee' }
  if (req.user.role === 'Manager' && !req.body.reportingManager) {
    req.body.reportingManager = req.user.name
  }
  next()
}

router.post('/', canCreate, restrictEmployeeFields, forceEmployeeRole, asyncHandler(createUser))

router.put('/:id', canWrite, restrictEmployeeFields, validateEmployeeUpdate, ctrl.update)
router.delete('/:id', canDelete, ctrl.remove)

router.post('/:id/photo', canWrite, uploadImage.single('photo'), ctrl.uploadPhoto)
router.post('/:id/documents', canWrite, upload.single('document'), ctrl.uploadDocument)
router.get('/:id/documents/:docId', canWrite, asyncHandler(ctrl.downloadDocument))

export default router
