import { useState, useRef, useEffect } from 'react'
import { X, Send, CheckCheck, Loader2, Sparkles, CheckSquare, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useThreadStore } from '@/stores/useThreadStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import type { ChatMessage } from '@/types'

// ── Helper ────────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ── ReplyItem ─────────────────────────────────────────────────────────────────

interface ReplyItemProps {
  reply: ChatMessage
  onDelete: (reply: ChatMessage) => void
  onEdit: (reply: ChatMessage) => void
}

function ReplyItem({ reply, onDelete, onEdit }: ReplyItemProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn('group relative flex', reply.isOwn ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover action bar — 본인 메시지만 표시 */}
      {hovered && reply.isOwn && (
        <div
          className={cn(
            'absolute -top-3 z-10 flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white px-1 py-0.5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800',
            reply.isOwn ? 'right-0' : 'left-0',
          )}
        >
          <button
            onClick={() => onEdit(reply)}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-blue-500 dark:hover:bg-neutral-700"
            title="수정"
          >
            <CheckSquare size={13} />
          </button>
          <button
            onClick={() => onDelete(reply)}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-500 dark:hover:bg-neutral-700"
            title="삭제"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      <div className="max-w-[85%]">
        {!reply.isOwn && (
          <p className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            {reply.isSystem && (
              <Sparkles size={10} className="text-violet-500" />
            )}
            {reply.authorName}
          </p>
        )}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm',
            reply.isOwn
              ? 'rounded-br-sm bg-primary-500 text-white'
              : reply.isSystem
                ? 'rounded-bl-sm border border-violet-200 bg-violet-50 text-neutral-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-neutral-100'
                : 'rounded-bl-sm bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100',
          )}
        >
          {reply.content}
        </div>
        <div
          className={cn(
            'mt-0.5 flex items-center gap-1 text-[10px] text-neutral-400',
            reply.isOwn ? 'justify-end' : 'justify-start',
          )}
        >
          {reply.isOwn && (
            <CheckCheck size={10} className="text-primary-400" />
          )}
          <span>{formatTime(reply.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

// ── EditReplyForm ─────────────────────────────────────────────────────────────

interface EditReplyFormProps {
  initialContent: string
  onSave: (content: string) => void
  onCancel: () => void
}

function EditReplyForm({ initialContent, onSave, onCancel }: EditReplyFormProps) {
  const [text, setText] = useState(initialContent)

  return (
    <div className="flex flex-col gap-1">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (text.trim()) onSave(text.trim())
          }
          if (e.key === 'Escape') onCancel()
        }}
        rows={2}
        className="w-full resize-none rounded-lg border border-primary-300 bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-100 dark:bg-neutral-800"
      />
      <div className="flex gap-1 text-xs">
        <button
          onClick={() => text.trim() && onSave(text.trim())}
          className="rounded bg-primary-500 px-2 py-0.5 text-white"
        >
          저장
        </button>
        <button
          onClick={onCancel}
          className="rounded bg-neutral-200 px-2 py-0.5 dark:bg-neutral-700"
        >
          취소
        </button>
      </div>
    </div>
  )
}

// ── ThreadPanel ───────────────────────────────────────────────────────────────

export function ThreadPanel() {
  const {
    selectedThreadId,
    parentMessage,
    replies,
    isLoading,
    error,
    closeThread,
    sendReply,
    deleteReply,
    updateReply,
  } = useThreadStore()
  const { closePanel } = useDetailPanelStore()

  const [replyInput, setReplyInput] = useState('')
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const threadReplies = selectedThreadId ? (replies[selectedThreadId] ?? []) : []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadReplies.length])

  useEffect(() => {
    if (selectedThreadId) {
      inputRef.current?.focus()
      setReplyInput('')
      setEditingReplyId(null)
    }
  }, [selectedThreadId])

  const handleClose = () => {
    closeThread()
    closePanel()
  }

  const handleSend = () => {
    if (!replyInput.trim() || !selectedThreadId || !parentMessage) return
    sendReply(parentMessage.channelId, replyInput.trim(), selectedThreadId)
    setReplyInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDelete = async (reply: ChatMessage) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return
    try {
      await deleteReply(reply.id, reply.channelId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '삭제 실패'
      alert(`삭제에 실패했습니다: ${msg}`)
    }
  }

  const handleSaveEdit = async (reply: ChatMessage, content: string) => {
    try {
      await updateReply(reply.id, content)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '수정 실패'
      alert(`수정에 실패했습니다: ${msg}`)
    } finally {
      setEditingReplyId(null)
    }
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!selectedThreadId || !parentMessage) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            스레드
          </span>
          <button
            onClick={handleClose}
            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
          메시지를 선택하세요
        </div>
      </div>
    )
  }

  // ── Main view ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          스레드
        </span>
        <button
          onClick={handleClose}
          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
        >
          <X size={16} />
        </button>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* 부모 메시지 */}
        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-800 dark:bg-primary-900/10">
          <p className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-primary-600 dark:text-primary-400">
            {parentMessage.isSystem && (
              <Sparkles size={10} />
            )}
            {parentMessage.authorName}
          </p>
          <p className="text-sm text-neutral-800 dark:text-neutral-100">
            {parentMessage.content}
          </p>
          <p className="mt-1 text-[10px] text-neutral-400">
            {formatTime(parentMessage.createdAt)}
          </p>
        </div>

        {/* 구분선 */}
        {threadReplies.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
            <span className="text-[10px] font-medium text-neutral-400">
              {threadReplies.length}개 답글
            </span>
            <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
          </div>
        )}

        {/* 답글 목록 */}
        {isLoading && threadReplies.length === 0 ? (
          <div className="flex justify-center py-4 text-neutral-400">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : error ? (
          <p className="py-4 text-center text-xs text-red-400">{error}</p>
        ) : (
          <div className="space-y-3">
            {threadReplies.map((reply) =>
              editingReplyId === reply.id ? (
                <div
                  key={reply.id}
                  className={cn('flex', reply.isOwn ? 'justify-end' : 'justify-start')}
                >
                  <div className="max-w-[85%] w-full">
                    <EditReplyForm
                      initialContent={reply.content}
                      onSave={(content) => void handleSaveEdit(reply, content)}
                      onCancel={() => setEditingReplyId(null)}
                    />
                  </div>
                </div>
              ) : (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  onDelete={(r) => void handleDelete(r)}
                  onEdit={(r) => setEditingReplyId(r.id)}
                />
              ),
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 답글 입력 */}
      <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={replyInput}
            onChange={(e) => setReplyInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="답글을 입력하세요..."
            rows={1}
            className="max-h-24 flex-1 resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-600 dark:bg-neutral-800 dark:focus:ring-primary-900"
          />
          <button
            onClick={handleSend}
            disabled={!replyInput.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
