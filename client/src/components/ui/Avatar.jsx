import { useEffect, useState } from 'react'
import { cn, initials, colorFromString } from '@/utils'

function resolveSrc(src) {
  if (!src || typeof src !== 'string') return src
  if (/^(https?:|data:|blob:)/i.test(src)) return src
  if (src.startsWith('/uploads') || src.startsWith('/chat-uploads') || src.startsWith('/profile-uploads')) {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '')
    return `${base}${src}`
  }
  // Drive fileId (no slash, long alphanumeric) -> proxy via server (works without public share)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(src) && !src.includes('.')) {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '')
    return `${base}/api/auth/avatar/${src}`
  }
  return src
}

export function Avatar({ name = '', src, size = 40, className, ring = true }) {
  const dimension = { width: size, height: size }
  const ringCls = ring ? 'ring-2 ring-white/40 dark:ring-white/10' : ''
  const resolved = resolveSrc(src)
  // If the stored avatar is gone (Drive deleted / ephemeral /uploads wiped /
  // live build still pointing at localhost), <img> 404s on every page for
  // avatar users only. Fall back to initials instead of a broken image +
  // console "Failed to load resource" spam.
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [resolved])
  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt={name}
        style={dimension}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn('rounded-full object-cover shadow-floating-sm', ringCls, className)}
      />
    )
  }
  return (
    <div
      style={{ ...dimension, backgroundColor: colorFromString(name) }}
      className={cn('flex items-center justify-center rounded-full font-semibold text-white shadow-inner-light', ringCls, className)}
    >
      <span style={{ fontSize: size * 0.4 }}>{initials(name)}</span>
    </div>
  )
}
