import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const CONTAINER_ID = 'main-content'
const storageKey = (pathname) => `skew:scroll:${pathname}`
const RESTORE_WINDOW_MS = 1500

export function ScrollMemory() {
  const { pathname } = useLocation()
  const restoreFrame = useRef(0)

  useEffect(() => {
    const el = document.getElementById(CONTAINER_ID)
    if (!el) return undefined

    let saveFrame = 0
    const onScroll = () => {
      if (saveFrame) return
      saveFrame = requestAnimationFrame(() => {
        saveFrame = 0
        try { sessionStorage.setItem(storageKey(pathname), String(el.scrollTop)) } catch {  }
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })

    let saved = 0
    try { saved = Number(sessionStorage.getItem(storageKey(pathname))) || 0 } catch { saved = 0 }

    if (saved > 0) {
      const startedAt = Date.now()
      const tick = () => {
        if (el.scrollHeight - el.clientHeight >= saved) {
          el.scrollTop = saved
          return
        }
        if (Date.now() - startedAt > RESTORE_WINDOW_MS) {
          el.scrollTop = Math.min(saved, Math.max(0, el.scrollHeight - el.clientHeight))
          return
        }
        restoreFrame.current = requestAnimationFrame(tick)
      }
      restoreFrame.current = requestAnimationFrame(tick)
    } else {
      el.scrollTop = 0
    }

    return () => {
      el.removeEventListener('scroll', onScroll)
      if (saveFrame) cancelAnimationFrame(saveFrame)
      if (restoreFrame.current) cancelAnimationFrame(restoreFrame.current)
    }
  }, [pathname])

  return null
}

export default ScrollMemory
