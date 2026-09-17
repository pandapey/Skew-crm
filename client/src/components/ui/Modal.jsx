import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import { cn } from '@/utils'

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
          <motion.div
            className={cn('glass-strong relative z-10 flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-card shadow-floating', sizes[size])}
            initial={{ scale: 0.95, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.18 }}
          >
            <div className="h-1 w-full flex-none bg-gradient-to-r from-primary via-accent to-violet" />
            <div className="flex flex-none items-center justify-between border-b border-app px-5 py-4">
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-xl p-1.5 text-muted transition hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            {footer && (
              <div className="flex flex-none justify-end gap-2 border-t border-app bg-black/[0.02] px-5 py-4 dark:bg-white/[0.03]">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
