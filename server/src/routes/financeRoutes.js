import { Router } from 'express'
import {
  Transaction, FinanceCategory, Budget, Invoice, Payment,
} from '../models/financeModels.js'
import { createResourceService } from '../services/resourceFactory.js'
import { financeService as svc, withId, withIds } from '../services/financeService.js'
import { financeValidators } from '../validators/financeValidators.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { protect, authorize } from '../middleware/auth.js'

const router = Router()

const FIN_ROLES = ['Admin', 'Manager']
const canWrite = authorize(...FIN_ROLES)

router.use(protect, authorize(...FIN_ROLES))

function financeResource(Model, config, validate) {
  const { service } = createResourceService(Model, config)
  const r = Router()
  r.get('/', asyncHandler(async (req, res) => {
    const result = await service.list(req.query)
    res.json({ ...result, data: withIds(result.data) })
  }))
  r.get('/all', asyncHandler(async (req, res) => res.json(withIds(await service.all()))))
  r.get('/:id', asyncHandler(async (req, res) => res.json(withId(await service.get(req.params.id)))))

  const createChain = validate ? [canWrite, validate] : [canWrite]
  r.post('/', ...createChain, asyncHandler(async (req, res) => {
    const doc = await service.create(req.body)
    res.status(201).json(withId(doc.toObject ? doc.toObject() : doc))
  }))
  r.put('/:id', canWrite, asyncHandler(async (req, res) => {
    const doc = await service.update(req.params.id, req.body)
    res.json(withId(doc.toObject ? doc.toObject() : doc))
  }))
  r.delete('/:id', canWrite, asyncHandler(async (req, res) => res.json(await service.remove(req.params.id))))
  return { router: r, service }
}

router.get('/stats', asyncHandler(async (req, res) => res.json(await svc.stats())))
router.get('/reports/tax', asyncHandler(async (req, res) => res.json(await svc.taxReport())))
router.get('/reports/period', asyncHandler(async (req, res) => res.json(await svc.periodReport(req.query.groupBy, req.query.year))))

const invoices = financeResource(Invoice, {
  searchFields: ['invoiceNumber', 'client'], filterFields: ['status', 'client'],
}, financeValidators.invoice)
invoices.router.post('/create', canWrite, asyncHandler(async (req, res) => res.status(201).json(await svc.createInvoice(req.body))))
invoices.router.patch('/:id/pay', canWrite, asyncHandler(async (req, res) => res.json(await svc.recordInvoicePayment(req.params.id, req.body.amount))))
router.use('/invoices', invoices.router)

router.use('/transactions', financeResource(Transaction, { searchFields: ['title', 'category', 'party', 'reference'], filterFields: ['type', 'category', 'method'] }, financeValidators.transaction).router)
router.use('/categories', financeResource(FinanceCategory, { searchFields: ['name'], filterFields: ['type'] }, financeValidators.category).router)
router.use('/budgets', financeResource(Budget, { searchFields: ['category', 'period'], filterFields: ['period', 'status'] }, financeValidators.budget).router)
router.use('/payments', financeResource(Payment, { searchFields: ['paymentNumber', 'party', 'invoiceNumber'], filterFields: ['direction', 'status', 'method'] }, financeValidators.payment).router)

export default router
