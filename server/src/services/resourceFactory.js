import mongoose from 'mongoose'
import { ApiError } from '../utils/asyncHandler.js'

function assertValidId(id, modelName = 'Record') {
  const raw = String(id ?? '')
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new ApiError(400, `A valid ${modelName} id is required (received "${raw || 'empty'}").`)
  }
  if (!mongoose.Types.ObjectId.isValid(raw)) {
    throw new ApiError(400, `"${raw}" is not a valid ${modelName} id.`)
  }
}

function sanitizeQuery(input) {
  if (Array.isArray(input)) return input.map(sanitizeQuery)
  if (input && typeof input === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(input)) {
      if (k.startsWith('$')) continue
      out[k] = sanitizeQuery(v)
    }
    return out
  }
  return input
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const withId = (doc) => (doc && doc._id ? { ...doc, id: String(doc._id) } : doc)

const plain = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc)
const normalize = (doc) => withId(plain(doc))

export function createResourceService(Model, { searchFields = [], filterFields = [] } = {}) {
  const repository = {
    findPaginated: ({ filter, sort, skip, limit }) =>
      Promise.all([
        Model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        Model.countDocuments(filter),
      ]),
    findById: (id) => Model.findById(id).lean(),
    findAll: () => Model.find().sort({ createdAt: -1 }).lean(),
    create: (payload) => Model.create(payload),
    updateById: (id, patch) => Model.findByIdAndUpdate(id, patch, { new: true, runValidators: true }),
    deleteById: (id) => Model.findByIdAndDelete(id),
  }

  const service = {
    async list(query) {
      const { search = '', page = 1, limit = 8 } = query

      const sortBy = (typeof query.sortBy === 'string' && query.sortBy.trim()) ? query.sortBy.trim() : 'createdAt'
      const order = query.order === 'asc' ? 'asc' : 'desc'

      const clean = sanitizeQuery(query)
      const filter = {}
      if (search && searchFields.length) {
        const safe = escapeRegex(search).slice(0, 100)
        filter.$or = searchFields.map((f) => ({ [f]: { $regex: safe, $options: 'i' } }))
      }

      filterFields.forEach((f) => {
        const v = clean[f]
        if (v != null && v !== '' && typeof v !== 'object') filter[f] = v
      })

      const pageNum = Math.max(1, Number(page))
      const limitNum = Math.min(100, Math.max(1, Number(limit)))
      const sort = { [sortBy]: order === 'asc' ? 1 : -1 }
      const [data, total] = await repository.findPaginated({ filter, sort, skip: (pageNum - 1) * limitNum, limit: limitNum })

      return { data: data.map(withId), total, page: pageNum, limit: limitNum, totalPages: Math.max(1, Math.ceil(total / limitNum)) }
    },
    all: async () => (await repository.findAll()).map(withId),
    async get(id) {
      assertValidId(id, Model.modelName)
      const doc = await repository.findById(id)
      if (!doc) throw new ApiError(404, `${Model.modelName} not found`)
      return withId(doc)
    },
    async create(payload) {
      return normalize(await repository.create(payload))
    },
    async update(id, patch) {
      assertValidId(id, Model.modelName)
      const doc = await repository.updateById(id, patch)
      if (!doc) throw new ApiError(404, `${Model.modelName} not found`)
      return normalize(doc)
    },
    async remove(id) {

      assertValidId(id, Model.modelName)
      const doc = await repository.deleteById(id)
      if (!doc) throw new ApiError(404, `${Model.modelName} not found`)
      return { id: String(id) }
    },
  }

  return { repository, service }
}
