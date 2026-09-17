import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/utils'
import { useAnchoredPopover } from './useAnchoredPopover'

export function Dropdown({ trigger, children, align = 'right', className }) {
  const [open, setOpen] = useState(false)
  const onDismiss = useCallback(() => setOpen(false), [])
  const { rootRef, anchorRef, popoverRef, style } = useAnchoredPopover({
    open,
    align,
    onDismiss,
    watch: children,
  })

  const menu = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          role="menu"
          style={style}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            'glass-strong fixed z-[60] w-max min-w-48 max-w-[min(20rem,calc(100vw-1rem))]',
            'overflow-y-auto overscroll-contain rounded-card p-1.5 shadow-floating'
          )}
          onClick={(e) => {
            e.stopPropagation()
            const el = e.target instanceof Element ? e.target : null
            if (!el || el.closest('[role="menuitem"]')) setOpen(false)
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={anchorRef}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  )
}

export function DropdownItem({ children, onClick, icon: Icon, danger, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition',
        danger
          ? 'text-danger hover:bg-danger/10'
          : active
            ? 'bg-primary/10 font-medium text-primary'
            : 'hover:bg-black/5 hover:text-current dark:hover:bg-white/10'
      )}
    >
      {Icon && <Icon className="h-4 w-4 flex-none" />}
      {children}
    </button>
  )
}
