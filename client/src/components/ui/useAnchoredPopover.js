import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export const POPOVER_GAP = 8
export const POPOVER_EDGE = 8

export const OPEN_GRACE_MS = 250

function samePos(a, b) {
  if (!a || !b) return false
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.maxHeight === b.maxHeight &&
    a.minWidth === b.minWidth &&
    a.placement === b.placement
  )
}

export function useAnchoredPopover({
  open,
  align = 'left',
  matchTriggerWidth = false,
  onDismiss,
  watch,
} = {}) {
  const anchorRef = useRef(null)
  const rootRef = useRef(null)
  const popoverRef = useRef(null)
  const [pos, setPos] = useState(null)

  const dismissRef = useRef(onDismiss)
  useEffect(() => { dismissRef.current = onDismiss })

  const place = useCallback(() => {
    const anchor = anchorRef.current || rootRef.current
    const pop = popoverRef.current
    if (!anchor || !pop) return
    const r = anchor.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    const natural = pop.scrollHeight
    const viewport = Math.max(0, vh - POPOVER_EDGE * 2)
    const desired = Math.min(natural, viewport)

    const below = vh - r.bottom - POPOVER_GAP - POPOVER_EDGE
    const above = r.top - POPOVER_GAP - POPOVER_EDGE

    const flip = desired > below && above > below
    const space = Math.max(0, flip ? above : below)

    const maxHeight = Math.max(0, Math.min(desired, space))

    const width = pop.offsetWidth
    let left = align === 'right' ? r.right - width : r.left
    left = Math.min(left, vw - width - POPOVER_EDGE)
    left = Math.max(POPOVER_EDGE, left)

    let top = flip ? r.top - POPOVER_GAP - maxHeight : r.bottom + POPOVER_GAP
    top = Math.min(top, vh - POPOVER_EDGE - maxHeight)
    top = Math.max(POPOVER_EDGE, top)

    const next = {
      top: Math.round(top),
      left: Math.round(left),
      maxHeight: Math.round(maxHeight),
      minWidth: matchTriggerWidth ? Math.round(r.width) : undefined,
      placement: flip ? 'top' : 'bottom',
    }
    setPos((prev) => (samePos(prev, next) ? prev : next))
  }, [align, matchTriggerWidth])

  useLayoutEffect(() => {
    if (!open) return
    place()
  }, [open, place, watch])

  useEffect(() => {
    if (!open) return
    const onMove = (e) => {
      const pop = popoverRef.current
      if (pop && e.target instanceof Node && pop.contains(e.target)) return
      place()
    }
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    let ro
    if (typeof ResizeObserver !== 'undefined' && anchorRef.current) {
      ro = new ResizeObserver(onMove)
      ro.observe(anchorRef.current)
    }
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
      if (ro) ro.disconnect()
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return undefined
    const isInside = (e) => {
      const nodes = [rootRef.current, anchorRef.current, popoverRef.current].filter(Boolean)
      if (!nodes.length) return false
      const path = typeof e.composedPath === 'function' ? e.composedPath() : null
      if (path && path.length) return nodes.some((n) => path.includes(n))
      return nodes.some((n) => n.contains(e.target))
    }
    const onDown = (e) => {
      if (isInside(e)) return
      dismissRef.current?.('outside')
    }
    const onKey = (e) => { if (e.key === 'Escape') dismissRef.current?.('escape') }
    let registered = false
    const timer = setTimeout(() => {
      registered = true
      document.addEventListener('pointerdown', onDown, true)
      document.addEventListener('keydown', onKey)
    }, 0)
    return () => {
      clearTimeout(timer)
      if (registered) {
        document.removeEventListener('pointerdown', onDown, true)
        document.removeEventListener('keydown', onKey)
      }
    }
  }, [open])

  const style = {
    top: pos ? pos.top : 0,
    left: pos ? pos.left : 0,
    maxHeight: pos ? pos.maxHeight : undefined,
    minWidth: pos ? pos.minWidth : undefined,

    visibility: pos ? 'visible' : 'hidden',
  }

  return { anchorRef, rootRef, popoverRef, pos, style, place, ready: Boolean(pos) }
}
