import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FiHeart, FiMessageCircle, FiBookmark, FiEdit2, FiTrash2, FiSend,
  FiPaperclip, FiImage, FiFilm, FiPlay, FiMapPin, FiTag, FiShare2,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { cn, formatDate } from '@/utils'
import { Avatar, Button, Badge } from '@/components/ui'
import { POST_TYPES } from './constants'
import { fileUrl } from '@/features/files/constants'

function MediaTile({ a, className = '' }) {
  const isVideo = a.type === 'video'
  const content = a.url ? (
    isVideo ? (
      <video src={fileUrl(a.url)} controls className="h-full w-full object-cover" />
    ) : (
      <img src={fileUrl(a.url)} alt={a.name} className="h-full w-full object-cover" />
    )
  ) : (
    <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br', a.color)}>
      {isVideo ? <FiFilm className="h-8 w-8 text-white/90" /> : <FiImage className="h-8 w-8 text-white/90" />}
    </div>
  )
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-black/5 dark:bg-white/5', className)}>
      {content}
      {!a.url && isVideo && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white">
            <FiPlay className="h-5 w-5" />
          </span>
        </div>
      )}
    </div>
  )
}

function Media({ attachments = [] }) {
  const images = attachments.filter((a) => a.type === 'image')
  const videos = attachments.filter((a) => a.type === 'video')
  const files = attachments.filter((a) => a.type === 'file')
  if (!attachments.length) return null

  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && (
        <div className={cn('grid gap-2', images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3')}>
          {images.map((a) => (
            <MediaTile key={a.id} a={a} className={images.length === 1 ? 'aspect-video' : 'aspect-square'} />
          ))}
        </div>
      )}
      {videos.map((a) => (
        <MediaTile key={a.id} a={a} className="aspect-video" />
      ))}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((a) => (
            <a
              key={a.id}
              href={fileUrl(a.url) || '#'}
              onClick={(e) => !a.url && e.preventDefault()}
              className="flex items-center gap-2 rounded-xl border border-app px-3 py-2 text-sm transition hover:border-primary/40"
            >
              <FiPaperclip className="text-muted" />
              <span className="font-medium">{a.name}</span>
              {a.size > 0 && <span className="text-xs text-muted">{Math.round(a.size / 1024)} KB</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PostCard({ post, onLike, onComment, onEdit, onDelete, onTogglePin, readOnly = false, unread = false, onRead = () => {} }) {
  const [showComments, setShowComments] = useState(false)
  const [draft, setDraft] = useState('')
  const meta = POST_TYPES[post.type] || POST_TYPES.announcement
  const Icon = meta.icon
  const liked = Boolean(post.liked)

  const toggleComments = () => {
    const next = !showComments
    setShowComments(next)
    if (next && unread) onRead(post.id)
  }

  const submitComment = () => {
    const text = draft.trim()
    if (!text) return
    onComment(post.id, text)
    setDraft('')
  }

  const share = async () => {
    const url = `${window.location.origin}/announcements#post-${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <motion.div
      id={`post-${post.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      {}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={post.author} size={42} />
          <div>
            <p className="font-semibold leading-tight">{post.author}</p>
            <p className="text-xs text-muted">
              {post.authorRole} · {formatDate(post.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', meta.soft, meta.text)}>
            <Icon className="h-3 w-3" /> {meta.label}
          </span>
          {post.pinned && (
            <Badge tone="warning"><FiBookmark className="mr-1" />Pinned</Badge>
          )}
        </div>
      </div>

      {}
      <h3 className="mt-3 flex items-center gap-2 text-lg font-semibold">

        {unread && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" title="Unread post" aria-label="Unread post" />
        )}
        {post.title}
      </h3>
      <p className="mt-1 whitespace-pre-line text-sm text-muted">{post.body}</p>

      {post.location && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><FiMapPin className="text-accent" />{post.location}</p>
      )}

      <Media attachments={post.attachments} />

      {post.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted dark:bg-white/10">
              <FiTag className="h-2.5 w-2.5" />{t}
            </span>
          ))}
        </div>
      )}

      {}
      <div className="mt-4 flex items-center gap-1 border-t border-app pt-3 text-sm">
        <button
          onClick={() => onLike(post.id)}
          className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition', liked ? 'text-danger' : 'text-muted hover:bg-black/5 dark:hover:bg-white/10')}
        >
          <FiHeart className={cn('h-4 w-4', liked && 'fill-current')} /> {post.likes}
        </button>
        <button
          onClick={toggleComments}
          className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition', showComments ? 'text-primary' : 'text-muted hover:bg-black/5 dark:hover:bg-white/10')}
        >
          <FiMessageCircle className="h-4 w-4" /> {post.comments?.length || 0}
        </button>
        <button
          onClick={share}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
          title="Copy link to this post"
        >
          <FiShare2 className="h-4 w-4" /> Share
        </button>
        {!readOnly && (
          <button
            onClick={() => onTogglePin(post.id)}
            className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition', post.pinned ? 'text-warning' : 'text-muted hover:bg-black/5 dark:hover:bg-white/10')}
            title={post.pinned ? 'Unpin' : 'Pin'}
          >
            <FiBookmark className={cn('h-4 w-4', post.pinned && 'fill-current')} />
          </button>
        )}
        {!readOnly && (
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => onEdit(post)} className="rounded-lg p-1.5 text-muted transition hover:bg-black/5 hover:text-primary dark:hover:bg-white/10" title="Edit">
              <FiEdit2 className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(post.id)} className="rounded-lg p-1.5 text-muted transition hover:bg-black/5 hover:text-danger dark:hover:bg-white/10" title="Delete">
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {}
      {showComments && (
        <div className="mt-3 space-y-3 border-t border-app pt-3">
          {(post.comments || []).map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar name={c.author} size={30} />
              <div className="flex-1 rounded-xl bg-black/[0.03] px-3 py-2 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{c.author}</p>
                  <p className="text-[11px] text-muted">{formatDate(c.date)}</p>
                </div>
                <p className="text-sm text-muted">{c.body}</p>
              </div>
            </div>
          ))}
          {(!post.comments || post.comments.length === 0) && (
            <p className="text-sm text-muted">No comments yet. Be the first!</p>
          )}
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Write a comment…"
              className="input flex-1"
            />
            <Button icon={FiSend} onClick={submitComment} disabled={!draft.trim()}>Post</Button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
