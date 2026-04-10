import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Hash,
  Users,
  Send,
  MessageSquare,
  ChevronDown,
  Maximize2,
  Smile,
  Paperclip,
  CheckCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useChatStore } from '@/stores/useChatStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import {
  MOCK_CHAT_CHANNELS,
  MOCK_DMS,
  MOCK_MESSAGES,
  MOCK_CHANNEL_MEMBERS,
  EMOJI_LIST,
  type MockChatChannel,
  type MockMessage,
} from '@/constants'

export function ChatPopup() {
  const { isMiniOpen, closeMini, activeChannelId, setActiveChannel } =
    useChatStore()
  const { activeGroupName } = useGroupContextStore()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<MockMessage[]>(MOCK_MESSAGES)
  const [showChannelList, setShowChannelList] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  /* 이모지 피커 상태 */
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  /* 멘션 자동완성 상태 */
  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const mentionRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* 파일 첨부 상태 */
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* 타이핑 인디케이터 상태 */
  const [showTyping, setShowTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const groupChannels = MOCK_CHAT_CHANNELS.filter((ch) => ch.channelName === activeGroupName)
  const allChannels = [...groupChannels, ...MOCK_DMS]
  const activeChannel =
    allChannels.find((c) => c.id === activeChannelId) ?? MOCK_CHAT_CHANNELS[0]

  const channelMessages = messages.filter(
    (m) => m.channelId === activeChannelId,
  )

  /* 메시지 목록 자동 스크롤 */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages.length, activeChannelId])

  /* 이모지 피커 / 멘션 드롭다운 외부 클릭 닫기 */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
      if (
        mentionRef.current &&
        !mentionRef.current.contains(e.target as Node)
      ) {
        setShowMentionList(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* 타이핑 인디케이터 시뮬레이션: 메시지 전송 후 잠시 표시 */
  const simulateTypingIndicator = useCallback(() => {
    setShowTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setShowTyping(false)
    }, 3000)
  }, [])

  /* 타이핑 타이머 정리 */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  if (!isMiniOpen) return null

  /* 메시지 전송 핸들러 (목업) */
  const handleSend = () => {
    if (!message.trim() && attachedFiles.length === 0) return
    const newMsg: MockMessage = {
      id: `mp-${Date.now()}`,
      channelId: activeChannelId ?? '',
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
      /* 첨부 파일이 있으면 첨부 정보 추가 */
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
    /* 전송 후 상대방 타이핑 시뮬레이션 */
    simulateTypingIndicator()
  }

  /* Enter 키로 메시지 전송 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* 텍스트 변경 시 멘션 감지 */
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMessage(val)

    /* @ 입력 시 멘션 드롭다운 표시 */
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

  /* 이모지를 입력창에 삽입 */
  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    setShowEmojiPicker(false)
    textareaRef.current?.focus()
  }

  /* 멘션 선택 시 @이름 삽입 */
  const insertMention = (name: string) => {
    const cursorPos = textareaRef.current?.selectionStart ?? message.length
    const textBeforeCursor = message.slice(0, cursorPos)
    const textAfterCursor = message.slice(cursorPos)
    const replaced = textBeforeCursor.replace(/@([^\s]*)$/, `@${name} `)
    setMessage(replaced + textAfterCursor)
    setShowMentionList(false)
    textareaRef.current?.focus()
  }

  /* 파일 선택 처리 */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(files)])
    }
    /* input 초기화 (같은 파일 재선택 가능) */
    e.target.value = ''
  }

  /* 첨부 파일 제거 */
  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  /* 필터된 멘션 멤버 목록 */
  const filteredMembers = MOCK_CHANNEL_MEMBERS.filter((m) =>
    m.name.toLowerCase().includes(mentionFilter),
  )

  return (
    <div className="fixed right-4 bottom-14 z-40 flex h-[480px] w-80 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-surface shadow-2xl dark:border-neutral-700 dark:bg-surface-dark-elevated sm:w-96">
      {/* ── 팝업 헤더 ── */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-neutral-200 px-3 dark:border-neutral-700">
        {/* 채널 선택 드롭다운 토글 버튼 */}
        <button
          onClick={() => setShowChannelList((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800 transition-colors hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
        >
          {activeChannel.type === 'dm' ? (
            <Users size={14} />
          ) : (
            <Hash size={14} />
          )}
          {activeChannel.type === 'dm'
            ? activeChannel.dmUser
            : activeChannel.name}
          <ChevronDown
            size={12}
            className={`transition-transform ${showChannelList ? 'rotate-180' : ''}`}
          />
        </button>
        <div className="flex items-center gap-1">
          {/* 풀사이즈 메신저 페이지로 이동 */}
          <Link
            to="/messenger"
            onClick={closeMini}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            title="전체 화면으로 보기"
          >
            <Maximize2 size={14} />
          </Link>
          {/* 미니 팝업 닫기 버튼 */}
          <button
            onClick={closeMini}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── 채널 선택 드롭다운 ── */}
      {showChannelList && (
        <div className="absolute top-10 left-0 right-0 z-50 max-h-60 overflow-y-auto border-b border-neutral-200 bg-surface shadow-md dark:border-neutral-700 dark:bg-surface-dark-elevated">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            채널 — {activeGroupName}
          </p>
          {groupChannels.map((ch) => (
            <ChannelOption
              key={ch.id}
              channel={ch}
              active={ch.id === activeChannelId}
              onSelect={(id) => {
                setActiveChannel(id)
                setShowChannelList(false)
              }}
            />
          ))}
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            DM
          </p>
          {MOCK_DMS.map((dm) => (
            <ChannelOption
              key={dm.id}
              channel={dm}
              active={dm.id === activeChannelId}
              onSelect={(id) => {
                setActiveChannel(id)
                setShowChannelList(false)
              }}
            />
          ))}
        </div>
      )}

      {/* ── 메시지 영역 ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {channelMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-neutral-400 dark:text-neutral-500">
            <div className="text-center">
              <MessageSquare
                size={28}
                className="mx-auto mb-1 text-neutral-300 dark:text-neutral-600"
              />
              <p>메시지가 없습니다</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {channelMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%]`}>
                  {!msg.isOwn && (
                    <p className="mb-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                      {msg.userName}
                    </p>
                  )}
                  {/* 메시지 버블 */}
                  <div
                    className={`rounded-xl px-3 py-1.5 text-xs ${
                      msg.isOwn
                        ? 'rounded-br-sm bg-primary-500 text-white'
                        : 'rounded-bl-sm bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'
                    }`}
                  >
                    {msg.content}
                    {/* 첨부 파일 표시 */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                              msg.isOwn
                                ? 'bg-primary-600/40'
                                : 'bg-neutral-200 dark:bg-neutral-600'
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
                  {/* 이모지 리액션 배지 */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {msg.reactions.map((r, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-0.5 rounded-full border border-neutral-200 bg-neutral-50 px-1 py-px text-[9px] dark:border-neutral-600 dark:bg-neutral-800"
                          title={r.users.join(', ')}
                        >
                          {r.emoji}
                          <span className="text-neutral-500 dark:text-neutral-400">{r.users.length}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    className={`mt-0.5 flex items-center gap-1 text-[9px] text-neutral-400 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* 읽음 확인 아이콘 (본인 메시지) */}
                    {msg.isOwn && msg.isRead && (
                      <CheckCheck size={10} className="text-primary-400" />
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* 타이핑 인디케이터 */}
            {showTyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <p className="mb-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                    박서준
                  </p>
                  {/* 입력 중 애니메이션 */}
                  <div className="inline-flex items-center gap-1 rounded-xl rounded-bl-sm bg-neutral-100 px-3 py-1.5 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                    <span className="text-[10px]">박서준님이 입력 중</span>
                    <span className="inline-flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-500" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-500" style={{ animationDelay: '150ms' }} />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-500" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── 입력창 ── */}
      <div className="relative shrink-0 border-t border-neutral-200 px-3 py-2 dark:border-neutral-700">
        {/* 이모지 피커 팝업 (입력창 위에 표시) */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-full left-2 right-2 mb-1 rounded-lg border border-neutral-200 bg-surface p-2 shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated"
          >
            {/* 이모지 그리드 */}
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-7 w-7 items-center justify-center rounded text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 멘션 자동완성 드롭다운 (입력창 위에 표시) */}
        {showMentionList && filteredMembers.length > 0 && (
          <div
            ref={mentionRef}
            className="absolute bottom-full left-2 right-2 mb-1 max-h-32 overflow-y-auto rounded-lg border border-neutral-200 bg-surface shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated"
          >
            <p className="px-2 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
              {/* 멘션 멤버 선택 */}
              멤버 멘션
            </p>
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => insertMention(member.name)}
                className="flex w-full items-center gap-2 px-2 py-1 text-xs text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                {/* 멤버 아바타 */}
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[9px] font-semibold text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                  {member.name[0]}
                </div>
                <span>@{member.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* 첨부 파일 칩 목록 */}
        {attachedFiles.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {attachedFiles.map((file, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
              >
                <Paperclip size={9} />
                <span className="max-w-[100px] truncate">{file.name}</span>
                {/* 첨부 파일 제거 버튼 */}
                <button
                  onClick={() => removeFile(idx)}
                  className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-600"
                >
                  <X size={8} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5">
          {/* 파일 첨부 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            title="파일 첨부"
          >
            <Paperclip size={13} />
          </button>
          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력... (@로 멘션)"
            rows={1}
            className="max-h-16 flex-1 resize-none rounded-lg border border-neutral-200 bg-surface px-2.5 py-1.5 text-xs outline-none transition placeholder:text-neutral-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:placeholder:text-neutral-500 dark:focus:ring-primary-900"
          />

          {/* 이모지 피커 토글 버튼 */}
          <button
            onClick={() => {
              setShowEmojiPicker((v) => !v)
              setShowMentionList(false)
            }}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
              showEmojiPicker
                ? 'bg-primary-100 text-primary-500 dark:bg-primary-900/40 dark:text-primary-400'
                : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
            }`}
            title="이모지 선택"
          >
            <Smile size={13} />
          </button>

          {/* 전송 버튼 (목업) */}
          <button
            onClick={handleSend}
            disabled={!message.trim() && attachedFiles.length === 0}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 채널 옵션 아이템 ── */

function ChannelOption({
  channel,
  active,
  onSelect,
}: {
  channel: MockChatChannel
  active: boolean
  onSelect: (id: string) => void
}) {
  return (
    /* 채널/DM 선택 옵션 버튼 */
    <button
      onClick={() => onSelect(channel.id)}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
        active
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
          : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800'
      }`}
    >
      {channel.type === 'dm' ? (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-[9px] font-semibold text-neutral-600 dark:bg-neutral-600 dark:text-neutral-200">
          {channel.dmUser?.[0]}
        </div>
      ) : (
        <Hash size={12} />
      )}
      <span className="truncate">
        {channel.type === 'dm' ? channel.dmUser : channel.name}
      </span>
      {channel.channelName && channel.type !== 'dm' && (
        <span className="ml-auto truncate text-[10px] text-neutral-400">
          {channel.channelName}
        </span>
      )}
      {channel.unread > 0 && (
        <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-error px-0.5 text-[9px] font-bold text-white">
          {channel.unread}
        </span>
      )}
    </button>
  )
}
