import { leaveService as svc } from '../services/leaveService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const leaveController = {
  list: asyncHandler(async (req, res) => res.json(await svc.list(req.query))),
  myRequests: asyncHandler(async (req, res) => res.json(await svc.myRequests(req.user, req.query))),
  get: asyncHandler(async (req, res) => res.json(await svc.get(req.params.id, req.user))),
  apply: asyncHandler(async (req, res) => res.status(201).json(await svc.apply(req.user, req.body))),
  applyHourly: asyncHandler(async (req, res) => res.status(201).json(await svc.applyHourly(req.user, req.body))),
  hourlyBalance: asyncHandler(async (req, res) => res.json(await svc.hourlyBalance(req.user, req.query.month))),
  approve: asyncHandler(async (req, res) => res.json(await svc.decide(req.params.id, 'approve', req.user.name, req.body.comment ?? req.body.note))),
  reject: asyncHandler(async (req, res) => res.json(await svc.decide(req.params.id, 'reject', req.user.name, req.body.comment ?? req.body.note))),
  cancel: asyncHandler(async (req, res) => res.json(await svc.cancel(req.user, req.params.id))),
  remove: asyncHandler(async (req, res) => res.json(await svc.remove(req.params.id))),
  balances: asyncHandler(async (req, res) => res.json(await svc.balances(req.user))),
  stats: asyncHandler(async (req, res) => res.json(await svc.stats())),
  holidays: asyncHandler(async (req, res) => res.json(await svc.holidays())),
}
