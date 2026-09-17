import jwt from 'jsonwebtoken'
import { User, LEGACY_ROLE_MAP } from '../models/User.js'

export const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  })

export const signRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  })

export async function protect(req, res, next) {
  if (req.user) return next()
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' })
    }
    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    if (!user) return res.status(401).json({ message: 'User no longer exists' })
    const merged = LEGACY_ROLE_MAP[user.role]
    if (merged) {
      user.role = merged
      await User.updateOne({ _id: user._id }, { $set: { role: merged } })
    }
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token failed' })
  }
}

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' })
  }
  next()
}

export const blockClient = (req, res, next) =>
  req.user?.role === 'Client'
    ? res.status(403).json({ message: 'Forbidden: clients cannot access this resource' })
    : next()
