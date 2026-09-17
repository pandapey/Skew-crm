import crypto from 'crypto'
import { AuditLog } from '../models/adminModels.js'

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 64

export const PASSWORD_RULES = [
  { id: 'length', label: `At least ${PASSWORD_MIN} characters`, test: (p) => p.length >= PASSWORD_MIN },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0–9)', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function validatePassword(pw = '') {
  if (pw.length > PASSWORD_MAX) {
    return { valid: false, errors: [], tooLong: true }
  }
  const errors = PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, passed: r.test(pw) }))
  return { valid: errors.every((e) => e.passed), errors }
}

export function strength(pw = '') {
  if (!pw) return null
  const passed = PASSWORD_RULES.filter((r) => r.test(pw)).length
  if (pw.length < PASSWORD_MIN || passed <= 2) return 'Weak'
  if (passed === 3) return 'Medium'
  if (passed === 4) return 'Strong'
  return 'Excellent'
}

export function generateTempPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$%&*?'
  const all = upper + lower + digits + special
  const pick = (set) => set[crypto.randomInt(set.length)]
  const parts = [
    pick(upper), pick(lower), pick(digits), pick(special),
    ...Array.from({ length: 8 }, () => pick(all)),
  ]

  for (let i = parts.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[parts[i], parts[j]] = [parts[j], parts[i]]
  }
  return parts.join('')
}

export async function audit(actor, action, { user = 'System', module = 'Users', severity = 'Info', ip = 'localhost' } = {}) {
  try {
    await AuditLog.create({ user, actor, action, module, severity, ip })
  } catch {

  }
}
