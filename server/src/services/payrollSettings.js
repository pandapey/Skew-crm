import { Setting } from '../models/adminModels.js'

export const PAYROLL_SETTINGS_CATEGORY = 'payroll'
export const PAYROLL_SETTINGS_DEFAULTS = {}

export async function getPayrollSettings() {
  const doc = await Setting.findOne({ category: PAYROLL_SETTINGS_CATEGORY }).lean()
  const data = doc?.data || {}
  return {
    ...PAYROLL_SETTINGS_DEFAULTS,
    ...data,
  }
}

export async function savePayrollSettings(patch = {}) {
  const current = await getPayrollSettings()
  const next = { ...current }
  await Setting.findOneAndUpdate(
    { category: PAYROLL_SETTINGS_CATEGORY },
    { $set: { data: next } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  return next
}
