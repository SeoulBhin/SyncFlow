import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  Smile,
  Paperclip,
  CheckCheck,
  MessageCircle,
  X,
  Hash,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useChatStore } from '@/stores/useChatStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { ChannelHeader } from '@/components/channel/ChannelHeader'
import {
  MOCK_CHAT_CHANNELS,
  MOCK_DMS,
  MOCK_MESSAGES,
  EMOJI_LIST,
  MOCK_CHANNEL_MEMBERS,
  type MockMessage,
} from '@/constants'

/* ── 온라인 상태 ── */
const ONLINE_USERS = new Set(['박서준', '이수현', '정우진'])

const EXTENDED_MOCK_MESSAGES: MockMessage[] = MOCK_MESSAGES.map((msg) => {
  if (msg.id === 'm1') return { ...msg, replyCount: 3 }
  if (msg.id === 'm7') return { ...msg, replyCount: 2 }
  return msg
})

export function ChannelView() {
  const { activeChannelId } = useChatStore()
  const { activeGroupName } = useGroupContextStore()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<MockMessage[]>(EXTENDED_MOCK_MESSAGES)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')

  const [showTyping, setShowTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const groupChannels = MOCK_CHAT_CHANNELS.filter((ch) => ch.channelName === activeGroupName)
  const activeChannel =
    [...groupChannels, ...MOCK_DMS].find((c) => c.id === activeChannelId) ??
    groupChannels[0] ?? MOCK_CHAT_CHANNELS[0]

  const channelMessages = messages.filter(
    (m) => m.channelId === activeChannelId && !m.parentMessageId,
  )

  const filteredMembers = MOCK_CHANNEL_MEMBERS.filter((m) =>
    m.name.toLowerCase().includes(mentionFilter),
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages.length, activeChannelId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  const simulateTypingIndicator = useCallback(() => {
    setShowTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setShowTyping(false), 3000)
  }, [])

  const handleSend = () => {
    if (!message.trim() && attachedFiles.length === 0) return
    const newMsg: MockMessage = {
      id: `mp-${Date.now()}`,
      channelId: activeChannelId,
      userId: 'u1',
      userName: '김민수',
      content: message.trim(),
      timestamp: new Date().toLocaleTimeString('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      isOwn: true,
      isRead: true,
      attachments: attachedFiles.length > 0
        ? attachedFiles.map((f, i) => ({
            id: `att-${Date.now()}-${i}`,
            name: f.name,
            size: `${(f.size / 1024).toFixed(0)}KB`,
            type: f.type.startsWith('image/') ? 'image' as const : 'file' as const,
          }))
        : undefined,
    }
    setMessages((prev) => [...prev, newMsg])
    setMessage('')
    setAttachedFiles([])
    simulateTypingIndicator()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMessage(val)
    const cursorPos = e.target.selectionStart ?? val.length
    const textBeforeCursor = val.slice(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@([^\s]*)$/)
    if (mentionMatch) {
      setMentionFilter(mentionMatch[1].toLowerCase())
      setShowMentionList(true)
    } else {
      setShowMentionList(false)
    }
  }

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    setShowEmojiPicker(false)
    textareaRef.current?.focus()
  }

  const insertMention = (name: string) => {
    const cursorPos = textareaRef.current?.selectionStart ?? message.length
    const textBeforeCursor = message.slice(0, cursorPos)
    const textAfterCursor = message.slice(cursorPos)
    const replaced = textBeforeCursor.replace(/@([^\s]*)$/, `@${name} `)
    setMessage(replaced + textAfterCursor)
    setShowMentionList(false)
    textareaRef.current?.focus()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) setAttachedFiles((prev) => [...prev, ...Array.from(files)])
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const { setActiveChannel } = useChatStore()

  return (
    <div className="flex h-full">
      {/* 좌측: 대화 목록 (채널 + DM) */}
      <div className="hidden w-[220px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 sm:flex">
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-200">메시지</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {groupChannels.length > 0 && (
            <div className="mb-2">
              <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                채널
              </p>
              {groupChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-1.5 text-xs transition-colors',
                    ch.id === activeChannelId
                      ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  )}
                >
                  <Hash size={13} className="shrink-0" />
                  <span className="flex-1 truncate text-left">{ch.name}</span>
                  {ch.unread > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {ch.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div>
            <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              DM
            </p>
            {MOCK_DMS.map((dm) => {
              const isOnline = ONLINE_USERS.has(dm.dmUser ?? '')
              return (
                <button
                  key={dm.id}
                  onClick={() => setActiveChannel(dm.id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-1.5 text-xs transition-colors',
                    dm.id === activeChannelId
                      ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  )}
                >
                  <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-[9px] font-bold text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200">
                    {dm.dmUser?.[0]}
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-[1.5px] border-neutral-50 dark:border-neutral-900',
                        isOnline ? 'bg-green-500' : 'bg-neutral-400',
                      )}
                    />
                  </span>
                  <span className="flex-1 truncate text-left">{dm.dmUser}</span>
                  {dm.unread > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {dm.unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 우측: 메시지 피드 */}
      <div className="flex flex-1 flex-col">
      <ChannelHeader />

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {channelMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-neutral-400">
            <div className="text-center">
              <p className="text-lg font-medium">#{activeChannel?.name ?? '채널'}</p>
              <p className="mt-1 text-sm">이 채널의 시작입니다. 첫 메시지를 보내보세요!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {channelMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%]`}>
                  {!msg.isOwn && (
                    <p className="mb-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {msg.userName}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm ${
                      msg.isOwn
                        ? 'rounded-br-sm bg-primary-500 text-white'
                        : 'rounded-bl-sm bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'
                    }`}
                  >
                    {msg.content}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                              msg.isOwn ? 'bg-primary-600/40' : 'bg-neutral-200 dark:bg-neutral-600'
                            }`}
                          >
                            <Paperclip size={9} />
                            <span className="truncate">{att.name}</span>
                            <span className="shrink-0 opacity-60">({att.size})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {msg.reactions.map((r, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-0.5 rounded-full border border-neutral-200 bg-neutral-50 px-1 py-px text-[9px] dark:border-neutral-600 dark:bg-neutral-800"
                        >
                          {r.emoji}
                          <span className="text-neutral-500 dark:text-neutral-400">{r.users.length}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={`mt-0.5 flex items-center gap-1.5 text-[10px] text-neutral-400 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                    {msg.isOwn && msg.isRead && <CheckCheck size={10} className="text-primary-400" />}
                    <span>{msg.timestamp}</span>
                    {(msg as MockMessage & { replyCount?: number }).replyCount && (
                      <button className="flex items-center gap-0.5 text-primary-500 hover:underline">
                        <MessageCircle size={10} />
                        {(msg as MockMessage & { replyCount?: number }).replyCount}개 답글
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {showTyping && (
              <div className="flex justify-start">
                <div className="max-w-[70%]">
                  <p className="mb-0.5 text-[11px] font-medium text-neutral-500">박서준</p>
                  <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-neutral-100 px-4 py-2 text-sm text-neutral-500 dark:bg-neutral-700">
                    <span className="text-xs">입력 중</span>
                    <span className="inline-flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '150ms' }} />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="relative shrink-0 border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
        {/* 이모지 피커 */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-full left-4 right-4 mb-1 rounded-lg border border-neutral-200 bg-surface p-2 shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated"
          >
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded text-base transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 멘션 드롭다운 */}
        {showMentionList && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-surface shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">멤버 멘션</p>
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => insertMention(member.name)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                  {member.name[0]}
                </div>
                @{member.name}
              </button>
            ))}
          </div>
        )}

        {/* 첨부 파일 */}
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {attachedFiles.map((file, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                <Paperclip size={10} />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button onClick={() => removeFile(idx)} className="ml-0.5 rounded-full p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-600">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700"
            title="파일 첨부"
          >
            <Paperclip size={16} />
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={`#${activeChannel?.name ?? '채널'}에 메시지 보내기`}
            rows={1}
            className="max-h-24 flex-1 resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-600 dark:bg-neutral-800 dark:focus:ring-primary-900"
          />

          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              showEmojiPicker
                ? 'bg-primary-100 text-primary-500 dark:bg-primary-900/40'
                : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            }`}
            title="이모지"
          >
            <Smile size={16} />
          </button>

          <button
            onClick={handleSend}
            disabled={!message.trim() && attachedFiles.length === 0}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
