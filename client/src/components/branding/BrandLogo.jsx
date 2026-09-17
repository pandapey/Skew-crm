import { useSelector } from 'react-redux'

const BASE = import.meta.env.BASE_URL || '/'

const LOGOS = {
  light: `${BASE}d-logo.png`,
  dark: `${BASE}logo.png`,
}
const FAVICON = `${BASE}favo.png`

export function BrandLogo({ variant = 'full', className, alt = 'Company logo' }) {
  const theme = useSelector((s) => s.ui?.theme || 'light')
  const src = variant === 'favicon' ? FAVICON : LOGOS[theme] || LOGOS.light
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
    />
  )
}
