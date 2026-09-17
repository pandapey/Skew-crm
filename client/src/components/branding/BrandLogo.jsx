import { useSelector } from 'react-redux'

const LOGOS = {
  light: '/d-logo.png',
  dark: '/logo.png',
}
const FAVICON = '/favo.png'

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
