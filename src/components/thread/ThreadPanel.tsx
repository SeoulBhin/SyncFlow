import { useState, useRef, useEffect } from 'react'
import { X, Send, CheckCheck } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useThreadStore } from '@/stores/useThreadStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import { MOCK_MESSAGES, MOCK_THREAD_REPLIES, type MockMessage } from '@/constants'

export function ThreadPanel() {
  const { selectedThreadId, closeThread } = useThreadStore()
  const { closePanel } = useDetailPanelStore()
  const [replyInput, setReplyInput] = useState('')
  const [replies, setReplies] = useState<MockMessage[]>(MOCK_THREAD_REPLIES)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const parentMessage = MOCK_MESSAGES.find((m) => m.id === selectedThreadId)
  const threadReplies = replies.filter((r) => r.parentMessageId === selectedThreadId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadReplies.length])

  useEffect(() => {
    inputRef.current?.focus()
  }, [selectedThreadId])

  const handleClose = () => {
    closeThread()
    closePanel()
  }

  const handleSend = () => {
    if (!replyInput.trim() || !selectedThreadId) return
    const newReply: MockMessage = {
      id: `tr-${Date.now()}`,
      channelId: parentMessage?.channelId ?? '',
      userId: 'u1',
      userName: '김민수',
      content: replyInput.trim(),
      timestamp: new Date().toLocaleTimeString('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      isOwn: true,
      isRead: true,
      parentMessageId: selectedThreadId,
    }
    setReplies((prev) => [...prev, newReply])
    setReplyInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!parentMessage) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">스레드</span>
          <button onClick={handleClose} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
          메시지를 선택하세요
        </div>
      </div>
    )
  }

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
        {/* 부모 메시지 — 강조 스타일 */}
        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-800 dark:bg-primary-900/10">
          <p className="mb-0.5 text-[11px] font-medium text-primary-600 dark:text-primary-400">
            {parentMessage.userName}
          </p>
          <p className="text-sm text-neutral-800 dark:text-neutral-100">
            {parentMessage.content}
          </p>
          <p className="mt-1 text-[10px] text-neutral-400">{parentMessage.timestamp}</p>
        </div>

        {/* 답글 구분선 */}
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
        <div className="space-y-3">
          {threadReplies.map((reply) => (
            <div
              key={reply.id}
              className={cn('flex', reply.isOwn ? 'justify-end' : 'justify-start')}
            >
              <div className="max-w-[85%]">
                {!reply.isOwn && (
                  <p className="mb-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    {reply.userName}
                  </p>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-3.5 py-2 text-sm',
                    reply.isOwn
                      ? 'rounded-br-sm bg-primary-500 text-white'
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
                  {reply.isOwn && reply.isRead && (
                    <CheckCheck size={10} className="text-primary-400" />
                  )}
                  <span>{reply.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
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
