import { systemLog, SYSTEM_LOG_SOURCES } from '../utils/systemLog.js'

export function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` })
}

const sourceFor = (req) =>
  String(req?.originalUrl || '').startsWith('/api/auth')
    ? SYSTEM_LOG_SOURCES.AUTH
    : SYSTEM_LOG_SOURCES.API

const record = (req, status, message) => {
  systemLog(
    status >= 500 ? 'ERROR' : 'WARN',
    `${status} ${req?.method || '?'} ${req?.originalUrl || '?'} — ${message}`,
    sourceFor(req),
  )
}

export function errorHandler(err, req, res, next) {
  console.error(err)

  if (err.name === 'CastError') {
    record(req, 400, `Invalid ${err.path}: ${err.value}`)
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` })
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(', ')
    record(req, 422, message)
    return res.status(422).json({ message })
  }

  if (err.code === 11000) {
    const message = `Duplicate value for ${Object.keys(err.keyValue).join(', ')}`
    record(req, 409, message)
    return res.status(409).json({ message })
  }

  if (err.name === 'MulterError') {
    record(req, 400, `Upload error: ${err.message}`)
    return res.status(400).json({ message: `Upload error: ${err.message}` })
  }

  if (err.message && /multipart|boundary/i.test(err.message)) {
    record(req, 400, `Upload error: ${err.message}`)
    return res.status(400).json({ message: 'Upload error: invalid multipart body' })
  }

  const status = err.statusCode || 500
  const message = err.message || 'Internal Server Error'
  record(req, status, message)
  res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}
