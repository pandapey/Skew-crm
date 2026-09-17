import { Employee } from '../models/Employee.js'

const HIDE_RETIRED = { workLocation: 0 }

export const employeeRepository = {
  async findPaginated({ filter, sort, skip, limit }) {
    const [data, total] = await Promise.all([
      Employee.find(filter, HIDE_RETIRED).sort(sort).skip(skip).limit(limit).lean(),
      Employee.countDocuments(filter),
    ])
    return { data, total }
  },

  findById: (id) => Employee.findById(id),
  findByIdLean: (id) => Employee.findById(id, HIDE_RETIRED).lean(),
  findOne: (query) => Employee.findOne(query),
  create: (payload) => Employee.create(payload),
  updateById: (id, patch) =>
    Employee.findByIdAndUpdate(id, patch, { new: true, runValidators: true, projection: HIDE_RETIRED }),
  deleteById: (id) => Employee.findByIdAndDelete(id),
  deleteMany: (ids) => Employee.deleteMany({ _id: { $in: ids } }),
  updateMany: (ids, patch) => Employee.updateMany({ _id: { $in: ids } }, { $set: patch }),

  pushSub: (id, field, value) =>
    Employee.findByIdAndUpdate(id, { $push: { [field]: value } }, { new: true }),

  aggregate: (pipeline) => Employee.aggregate(pipeline),
  countAll: () => Employee.countDocuments(),
}
