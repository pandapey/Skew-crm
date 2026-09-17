import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { protect, authorize } from '../middleware/auth.js'

const HR_WRITE = ['Admin', 'Manager']

export function buildResourceRouter(service, { validate, extraRoutes, readGuard, writeGuard } = {}) {
  const router = Router()
  const canWrite = authorize(...HR_WRITE)
  const readGuardFn = readGuard || canWrite
  const writeGuardFn = writeGuard || canWrite

  router.use(protect, readGuardFn)

  router.get('/', asyncHandler(async (req, res) => res.json(await service.list(req.query))))
  router.get('/all', asyncHandler(async (req, res) => res.json(await service.all())))
  router.get('/:id', asyncHandler(async (req, res) => res.json(await service.get(req.params.id))))

  const createChain = validate ? [writeGuardFn, validate] : [writeGuardFn]
  router.post('/', ...createChain, asyncHandler(async (req, res) => res.status(201).json(await service.create(req.body))))
  router.put('/:id', writeGuardFn, asyncHandler(async (req, res) => res.json(await service.update(req.params.id, req.body))))
  router.delete('/:id', writeGuardFn, asyncHandler(async (req, res) => res.json(await service.remove(req.params.id))))

  if (extraRoutes) extraRoutes(router, writeGuardFn)

  return router
}
