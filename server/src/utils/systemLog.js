import { SystemLog } from '../models/adminModels.js'

export const SYSTEM_LOG_SOURCES = Object.freeze({
  API: 'api-gateway',
  AUTH: 'auth-service',
  DB: 'db-connector',
  CRON: 'cron-scheduler',
})

const MAX_MESSAGE = 2000

export function systemLog(level, message, source = SYSTEM_LOG_SOURCES.API) {
  if (!message) return
  SystemLog.create({
    level,
    source,
    message: String(message).slice(0, MAX_MESSAGE),
    at: new Date(),
  }).catch(() => {})
}
