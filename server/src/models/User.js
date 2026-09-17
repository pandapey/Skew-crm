import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

export const ROLES = ['Admin', 'Manager', 'Employee', 'Client']

export const LEGACY_ROLE_MAP = Object.freeze({
  'Super Admin': 'Admin',
  HR: 'Manager',
  Sales: 'Manager',
  Finance: 'Manager',
  Inventory: 'Manager',
})

export const GENDERS = ['Male', 'Female']

export const normalizeRole = (role) => LEGACY_ROLE_MAP[role] || role

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 5, select: false },
    role: { type: String, enum: ROLES, default: 'Employee' },
    gender: { type: String, enum: [...GENDERS, null], default: null },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    avatar: { type: String, default: '' },
    clientId: { type: String, default: '' },
    phone: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended', 'Pending', 'Blocked'],
      default: 'Active',
    },
    lastLogin: { type: Date },
    notes: { type: String, default: '' },
    employeeId: { type: String, default: '' },
    clientCode: { type: String, default: '' },
    empCode: { type: String, default: '' },
    employmentType: { type: String, default: 'Full-time' },
    joiningDate: { type: Date },
    experienceYears: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    salaryCtc: { type: Number, default: 0 },
    reportingManager: { type: String, default: '' },
    reportingTeam: { type: [String], default: [] },
    shift: { type: String, default: '' },
    resetToken: { type: String, select: false },
    resetTokenExpiry: { type: Date, select: false },
  },
  { timestamps: true }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

userSchema.index({ role: 1 })

export const User = mongoose.model('User', userSchema)
