export function sanitizeQuery(input) {
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

export function scalarOrNull(value) {
  if (value == null) return null
  if (typeof value === 'object') return null
  if (typeof value === 'string' && value.trim() === '') return null
  return value
}

export function escapeRegex(str, maxLen = 100) {
  return String(str == null ? '' : str)
    .slice(0, maxLen)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function clampLimit(value, max = 100) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return max
  return Math.min(max, Math.max(1, Math.floor(n)))
}

export function clampPage(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.floor(n)
}
