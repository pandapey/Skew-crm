import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'
import { cn } from '@/utils'

export function AnimatedNumber({ value, format, className, duration = 1.1 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(0)

  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''))
  const isNum = !Number.isNaN(num)

  useEffect(() => {
    if (!inView || !isNum) return
    const controls = animate(0, num, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [inView, num, isNum, duration])

  const text = isNum
    ? format
      ? format(Math.round(display))
      : Math.round(display).toLocaleString('en-IN')
    : value

  return (
    <span ref={ref} className={cn(className)}>
      {text}
    </span>
  )
}
