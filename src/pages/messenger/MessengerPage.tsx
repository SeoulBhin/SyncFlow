import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Hash,
  Users,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronRight,
  X,
  Smile,
  Paperclip,
  Search,
  CheckCheck,
  ImageIcon,
  FileText,
  Plus,
  MessageCircle,
} from 'lucide-react'
import { useChatStore } from '@/stores/useChatStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import {
  MOCK_CHAT_CHANNELS,
  MOCK_DMS,
  MOCK_MESSAGES,
  EMOJI_LIST,
  MOCK_CHANNEL_MEMBERS,
  type MockChatChannel,
  type MockMessage,
} from '@/constants'

/* ── 스레드 목업 메시지 (로컬 데이터) ── */
const THREAD_MESSAGES: MockMessage[] = [
  /* m1(이수현의 마케팅 보고서 메시지)에 대한 답글 */
  { id: 'tm1', channelId: 'cc1', userId: 'u1', userName: '김민수', content: '오후 4시까지 피드백 드리겠습니다.', timestamp: '오후 2:35', isOwn: true, parentMessageId: 'm1' },
  { id: 'tm2', channelId: 'cc1', userId: 'u4', userName: '김하늘', content: '디자인 파트 제가 먼저 확인할게요.', timestamp: '오후 2:40', isOwn: false, parentMessageId: 'm1' },
  { id: 'tm3', channelId: 'cc1', userId: 'u3', userName: '이수현', content: '감사합니다! 수정사항 있으면 알려주세요.', timestamp: '오후 2:45', isOwn: false, parentMessageId: 'm1' },
  /* m7(박서준의 결제 모듈 PR 메시지)에 대한 답글 */
  { id: 'tm4', channelId: 'cc2', userId: 'u1', userName: '김민수', content: 'LGTM! 몇 가지 코멘트 남겼습니다.', timestamp: '오후 1:25', isOwn: true, parentMessageId: 'm7' },
  { id: 'tm5', channelId: 'cc2', userId: 'u5', userName: '정우진', content: '저도 리뷰 완료했습니다.', timestamp: '오후 1:30', isOwn: false, parentMessageId: 'm7' },
]

/* m1, m7에 replyCount 추가한 확장 메시지 목록 */
const EXTENDED_MOCK_MESSAGES: MockMessage[] = MOCK_MESSAGES.map((msg) => {
  if (msg.id === 'm1') return { ...msg, replyCount: 3 }
  if (msg.id === 'm7') return { ...msg, replyCount: 2 }
  return msg
})

export function MessengerPage() {
  const navigate = useNavigate()
  const { activeChannelId, setActiveChannel } = useChatStore()
  const { activeGroupName } = useGroupContextStore()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<MockMessage[]>(EXTENDED_MOCK_MESSAGES)
  const [threadMessages, setThreadMessages] = useState<MockMessage[]>(THREAD_MESSAGES)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const threadMessagesEndRef = useRef<HTMLDivElement>(null)
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)

  /* 이모지 피커 상태 */
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  /* 메시지별 리액션 이모지 피커 상태 */
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null)

  /* @멘션 자동완성 상태 */
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)

  /* 파일 첨부 상태 */
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* 메시지 검색 상태 */
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  /* 타이핑 인디케이터 (목업 — 항상 표시) */
  const [isTyping] = useState(true)

  /* textarea ref (커서 위치 이모지 삽입용) */
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* 스레드 패널 상태 */
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [threadMessage, setThreadMessage] = useState('')
  const threadTextareaRef = useRef<HTMLTextAreaElement>(null)

  /* 스레드 이모지 피커 상태 */
  const [showThreadEmojiPicker, setShowThreadEmojiPicker] = useState(false)

  const groupChannels = MOCK_CHAT_CHANNELS.filter((ch) => ch.channelName === activeGroupName)
  const activeChannel =
    [...groupChannels, ...MOCK_DMS].find((c) => c.id === activeChannelId) ??
    groupChannels[0] ?? MOCK_CHAT_CHANNELS[0]

  /* 메인 채널에는 최상위 메시지만 표시 (parentMessageId가 없는 것) */
  const channelMessages = messages.filter(
    (m) => m.channelId === activeChannelId && !m.parentMessageId,
  )

  /* 검색 필터링 */
  const filteredMessages = searchQuery.trim()
    ? channelMessages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : channelMessages

  /* 멘션 필터링 */
  const filteredMembers =
    mentionQuery !== null
      ? MOCK_CHANNEL_MEMBERS.filter((m) =>
          m.name.toLowerCase().includes(mentionQuery.toLowerCase()),
        )
      : []

  /* 현재 열린 스레드의 원본 메시지 */
  const threadParentMessage = activeThreadId
    ? messages.find((m) => m.id === activeThreadId) ?? null
    : null

  /* 현재 스레드의 답글 목록 */
  const currentThreadReplies = activeThreadId
    ? threadMessages.filter((m) => m.parentMessageId === activeThreadId)
    : []

  /* 메신저 페이지에서는 부모 main의 하단 여백/스크롤 제거 (풀사이즈 레이아웃) */
  useEffect(() => {
    const main = document.querySelector('main')
    if (main) {
      main.style.paddingBottom = '0'
      main.style.overflow = 'hidden'
    }
    return () => {
      if (main) {
        main.style.paddingBottom = ''
        main.style.overflow = ''
      }
    }
  }, [])

  /* 메시지 목록 자동 스크롤 (새 메시지 추가 또는 채널 변경 시) */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages.length, activeChannelId])

  /* 스레드 메시지 목록 자동 스크롤 */
  useEffect(() => {
    threadMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentThreadReplies.length, activeThreadId])

  /* 채널 변경 시 스레드 패널 닫기 */
  useEffect(() => {
    setActiveThreadId(null)
  }, [activeChannelId])

  /* 메시지 전송 핸들러 (목업 — 로컬 상태에 추가) */
  const handleSend = () => {
    if (!message.trim() && attachedFiles.length === 0) return
    const newMsg: MockMessage = {
      id: `m-${Date.now()}`,
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
      isRead: false,
      attachments: attachedFiles.map((f, i) => ({
        id: `att-${Date.now()}-${i}`,
        name: f.name,
        size: formatFileSize(f.size),
        type: f.type.startsWith('image/') ? 'image' as const : 'file' as const,
      })),
    }
    setMessages((prev) => [...prev, newMsg])
    setMessage('')
    setAttachedFiles([])
    setMentionQuery(null)
  }

  /* 스레드 메시지 전송 핸들러 */
  const handleThreadSend = () => {
    if (!threadMessage.trim() || !activeThreadId) return
    const newReply: MockMessage = {
      id: `tm-${Date.now()}`,
      channelId: activeChannelId ?? '',
      userId: 'u1',
      userName: '김민수',
      content: threadMessage.trim(),
      timestamp: new Date().toLocaleTimeString('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      isOwn: true,
      isRead: false,
      parentMessageId: activeThreadId,
    }
    setThreadMessages((prev) => [...prev, newReply])
    /* 부모 메시지의 replyCount 증가 */
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== activeThreadId) return m
        return { ...m, replyCount: (m.replyCount ?? 0) + 1 }
      }),
    )
    setThreadMessage('')
  }

  /* Enter 키로 메시지 전송 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    /* 멘션 드롭다운이 열려 있을 때 키보드 내비게이션 */
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((prev) => (prev + 1) % filteredMembers.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredMembers[mentionIndex].name)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* 스레드 입력 Enter 키 핸들러 */
  const handleThreadKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleThreadSend()
    }
  }

  /* textarea 변경 핸들러 — @멘션 감지 포함 */
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMessage(val)

    /* 커서 위치 기준으로 @ 뒤의 텍스트 추출 */
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@([^\s]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  /* 멘션 삽입 */
  const insertMention = (name: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const textBeforeCursor = message.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')
    if (atIndex === -1) return
    const before = message.slice(0, atIndex)
    const after = message.slice(cursorPos)
    const newMessage = `${before}@${name} ${after}`
    setMessage(newMessage)
    setMentionQuery(null)
    /* 포커스 복원 */
    setTimeout(() => {
      textarea.focus()
      const newPos = atIndex + name.length + 2
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  /* 이모지 삽입 (커서 위치에) */
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setMessage((prev) => prev + emoji)
      setShowEmojiPicker(false)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = message.slice(0, start)
    const after = message.slice(end)
    const newMessage = before + emoji + after
    setMessage(newMessage)
    setShowEmojiPicker(false)
    setTimeout(() => {
      textarea.focus()
      const newPos = start + emoji.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  /* 스레드 이모지 삽입 */
  const insertThreadEmoji = (emoji: string) => {
    const textarea = threadTextareaRef.current
    if (!textarea) {
      setThreadMessage((prev) => prev + emoji)
      setShowThreadEmojiPicker(false)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = threadMessage.slice(0, start)
    const after = threadMessage.slice(end)
    const newMsg = before + emoji + after
    setThreadMessage(newMsg)
    setShowThreadEmojiPicker(false)
    setTimeout(() => {
      textarea.focus()
      const newPos = start + emoji.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  /* 메시지에 리액션 추가 */
  const addReaction = (msgId: string, emoji: string) => {
    const updater = (prev: MockMessage[]) =>
      prev.map((m) => {
        if (m.id !== msgId) return m
        const existing = m.reactions ?? []
        const found = existing.find((r) => r.emoji === emoji)
        if (found) {
          /* 이미 같은 이모지가 있으면 유저 추가 (토글) */
          if (found.users.includes('u1')) {
            const updated = found.users.filter((u) => u !== 'u1')
            if (updated.length === 0) {
              return { ...m, reactions: existing.filter((r) => r.emoji !== emoji) }
            }
            return {
              ...m,
              reactions: existing.map((r) =>
                r.emoji === emoji ? { ...r, users: updated } : r,
              ),
            }
          }
          return {
            ...m,
            reactions: existing.map((r) =>
              r.emoji === emoji ? { ...r, users: [...r.users, 'u1'] } : r,
            ),
          }
        }
        return { ...m, reactions: [...existing, { emoji, users: ['u1'] }] }
      })

    setMessages(updater)
    setThreadMessages(updater)
    setReactionPickerMsgId(null)
  }

  /* 파일 첨부 처리 */
  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) return
    setAttachedFiles((prev) => [...prev, ...Array.from(fileList)])
  }

  /* 파일 첨부 제거 */
  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  /* 파일 크기 포맷 */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  /* 드래그 앤 드롭 핸들러 */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [])

  /* 스레드 열기 */
  const openThread = (msgId: string) => {
    setActiveThreadId(msgId)
  }

  /* 스레드 닫기 */
  const closeThread = () => {
    setActiveThreadId(null)
    setThreadMessage('')
    setShowThreadEmojiPicker(false)
  }

  /* ── 메시지 버블 렌더링 (메인 채널 + 스레드 공용) ── */
  const renderMessageBubble = (msg: MockMessage, options?: { showThreadIndicator?: boolean }) => {
    const showThread = options?.showThreadIndicator ?? false
    const replyCount = msg.replyCount ?? 0

    return (
      <div
        key={msg.id}
        className={`group flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[70%] ${msg.isOwn ? 'order-2' : 'order-1'}`}
        >
          {/* 보낸 사람 이름 (본인 메시지 제외) */}
          {!msg.isOwn && (
            <p className="mb-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {msg.userName}
            </p>
          )}
          {/* 첨부 파일 표시 */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mb-1 space-y-1">
              {msg.attachments.map((att) => (
                <div
                  key={att.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                    msg.isOwn
                      ? 'bg-primary-400/30 text-white'
                      : 'bg-neutral-50 text-neutral-600 dark:bg-neutral-600 dark:text-neutral-200'
                  }`}
                >
                  {att.type === 'image' ? (
                    <ImageIcon size={14} className="shrink-0" />
                  ) : (
                    <FileText size={14} className="shrink-0" />
                  )}
                  <span className="truncate">{att.name}</span>
                  <span className="shrink-0 text-[10px] opacity-70">
                    {att.size}
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* 메시지 버블 (보낸/받은 구분 색상) */}
          <div
            className={`rounded-2xl px-3.5 py-2 text-sm ${
              msg.isOwn
                ? 'rounded-br-md bg-primary-500 text-white'
                : 'rounded-bl-md bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'
            }`}
          >
            {msg.content}
          </div>
          {/* 스레드 답글 인디케이터 — 메인 채널에서만 표시 */}
          {showThread && replyCount > 0 && (
            <button
              onClick={() => openThread(msg.id)}
              className={`mt-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 ${
                msg.isOwn ? 'ml-auto' : ''
              }`}
              title="스레드 답글 보기"
            >
              {/* 스레드 답글 수 표시 */}
              <MessageCircle size={12} />
              <span>{replyCount}개 답글</span>
            </button>
          )}
          {/* 리액션 배지 표시 */}
          {msg.reactions && msg.reactions.length > 0 && (
            <div className={`mt-1 flex flex-wrap items-center gap-1 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
              {msg.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => addReaction(msg.id, reaction.emoji)}
                  className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors ${
                    reaction.users.includes('u1')
                      ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/30'
                      : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500'
                  }`}
                  title="리액션 토글"
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {reaction.users.length}
                  </span>
                </button>
              ))}
              {/* 리액션 추가 버튼 (호버 시 표시) */}
              <div className="relative">
                <button
                  onClick={() =>
                    setReactionPickerMsgId(
                      reactionPickerMsgId === msg.id ? null : msg.id,
                    )
                  }
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 hover:border-neutral-300 hover:text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:text-neutral-300"
                  title="리액션 추가"
                >
                  <Plus size={10} />
                </button>
                {/* 리액션 미니 이모지 피커 */}
                {reactionPickerMsgId === msg.id && (
                  <>
                    {/* 백드롭 (클릭 시 닫기) */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setReactionPickerMsgId(null)}
                    />
                    <div className={`absolute z-50 bottom-7 ${msg.isOwn ? 'right-0' : 'left-0'} w-52 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-600 dark:bg-neutral-800`}>
                      <div className="grid grid-cols-8 gap-0.5">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(msg.id, emoji)}
                            className="flex h-6 w-6 items-center justify-center rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            title="이모지 리액션"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {/* 리액션이 없을 때도 호버 시 + 버튼 표시 */}
          {(!msg.reactions || msg.reactions.length === 0) && (
            <div className={`mt-1 flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className="relative">
                <button
                  onClick={() =>
                    setReactionPickerMsgId(
                      reactionPickerMsgId === msg.id ? null : msg.id,
                    )
                  }
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 hover:border-neutral-300 hover:text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:text-neutral-300"
                  title="리액션 추가"
                >
                  <Plus size={10} />
                </button>
                {reactionPickerMsgId === msg.id && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setReactionPickerMsgId(null)}
                    />
                    <div className={`absolute z-50 bottom-7 ${msg.isOwn ? 'right-0' : 'left-0'} w-52 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-600 dark:bg-neutral-800`}>
                      <div className="grid grid-cols-8 gap-0.5">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(msg.id, emoji)}
                            className="flex h-6 w-6 items-center justify-center rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            title="이모지 리액션"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {/* 메시지 시간 + 읽음 표시 */}
          <p
            className={`mt-0.5 flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
          >
            {msg.timestamp}
            {/* 읽음 확인 (본인 메시지 + isRead) */}
            {msg.isOwn && msg.isRead && (
              <CheckCheck size={12} className="text-blue-500" />
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* ====== 좌측: 채널/DM 목록 (디스코드 스타일, 256px) ====== */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-surface-secondary dark:border-neutral-700 dark:bg-surface-dark-secondary md:flex">
        <div className="flex h-14 items-center border-b border-neutral-200 px-4 dark:border-neutral-700">
          <div>
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              메신저
            </h2>
            {activeGroupName && (
              <p className="text-[10px] text-neutral-400">{activeGroupName}</p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {/* 채널 섹션 토글 */}
          <button
            onClick={() => setChannelsOpen((v) => !v)}
            className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            {channelsOpen ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
            채널
          </button>

          {channelsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {groupChannels.map((ch) => (
                <ChannelItem
                  key={ch.id}
                  channel={ch}
                  active={ch.id === activeChannelId}
                  onSelect={setActiveChannel}
                />
              ))}
            </div>
          )}

          {/* DM 섹션 토글 */}
          <button
            onClick={() => setDmsOpen((v) => !v)}
            className="mt-4 flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            {dmsOpen ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
            다이렉트 메시지
          </button>

          {dmsOpen && (
            <div className="mt-0.5 space-y-0.5">
              {MOCK_DMS.map((dm) => (
                <ChannelItem
                  key={dm.id}
                  channel={dm}
                  active={dm.id === activeChannelId}
                  onSelect={setActiveChannel}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ====== 중앙: 메시지 영역 (flex-1) ====== */}
      <div
        className="flex flex-1 flex-col relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 드래그 앤 드롭 오버레이 */}
        {dragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary-500/20 border-2 border-dashed border-primary-400 rounded-lg">
            <p className="text-lg font-semibold text-primary-600 dark:text-primary-300">
              파일을 놓으세요
            </p>
          </div>
        )}

        {/* 채널 헤더 */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            {activeChannel.type === 'dm' ? (
              <Users size={18} className="text-neutral-400" />
            ) : (
              <Hash size={18} className="text-neutral-400" />
            )}
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {activeChannel.type === 'dm'
                ? activeChannel.dmUser
                : activeChannel.name}
            </span>
            {activeChannel.channelName && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                — {activeChannel.channelName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* 메시지 검색 버튼 */}
            <button
              onClick={() => {
                setSearchOpen((v) => !v)
                if (searchOpen) setSearchQuery('')
              }}
              className={`rounded-lg p-1.5 transition-colors ${
                searchOpen
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
              }`}
              title="메시지 검색"
            >
              <Search size={18} />
            </button>
            {/* 메신저 닫기 — 이전 페이지로 돌아가기 */}
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              title="메신저 닫기"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 검색 바 (토글) */}
        {searchOpen && (
          <div className="shrink-0 border-b border-neutral-200 px-4 py-2 dark:border-neutral-700 flex items-center gap-2">
            <Search size={14} className="text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="메시지 검색..."
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            {searchQuery.trim() && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {filteredMessages.length}개 결과
              </span>
            )}
            {/* 검색 닫기 */}
            <button
              onClick={() => {
                setSearchOpen(false)
                setSearchQuery('')
              }}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              title="검색 닫기"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 메시지 리스트 */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {filteredMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
              <div className="text-center">
                <MessageSquare
                  size={40}
                  className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600"
                />
                {searchQuery.trim() ? (
                  <>
                    <p>검색 결과가 없습니다</p>
                    <p className="text-xs">다른 키워드로 검색해보세요</p>
                  </>
                ) : (
                  <>
                    <p>아직 메시지가 없습니다</p>
                    <p className="text-xs">첫 메시지를 보내보세요!</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((msg) =>
                renderMessageBubble(msg, { showThreadIndicator: true }),
              )}

              {/* 타이핑 인디케이터 (목업) */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[70%]">
                    <p className="mb-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      박서준
                    </p>
                    <div className="rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-2 text-sm text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-0.5">
                        박서준님이 입력 중
                        <span className="inline-flex">
                          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 자동 스크롤 앵커 */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 파일 첨부 미리보기 영역 */}
        {attachedFiles.length > 0 && (
          <div className="shrink-0 border-t border-neutral-200 px-4 pt-2 dark:border-neutral-700">
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs dark:border-neutral-600 dark:bg-neutral-800"
                >
                  {file.type.startsWith('image/') ? (
                    <ImageIcon size={14} className="text-neutral-400" />
                  ) : (
                    <FileText size={14} className="text-neutral-400" />
                  )}
                  <span className="max-w-[120px] truncate text-neutral-700 dark:text-neutral-300">
                    {file.name}
                  </span>
                  <span className="text-neutral-400">{formatFileSize(file.size)}</span>
                  {/* 첨부 파일 제거 버튼 */}
                  <button
                    onClick={() => removeAttachedFile(index)}
                    className="text-neutral-400 hover:text-error"
                    title="첨부 파일 제거"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메시지 입력창 (하단 툴바 높이만큼 pb 확보) */}
        <div className="shrink-0 border-t border-neutral-200 px-4 py-3 pb-14 dark:border-neutral-700 relative">
          {/* @멘션 자동완성 드롭다운 */}
          {mentionQuery !== null && filteredMembers.length > 0 && (
            <>
              {/* 백드롭 (클릭 시 닫기) */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMentionQuery(null)}
              />
              <div className="absolute bottom-full left-4 z-50 mb-1 w-56 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-800">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase text-neutral-400">
                  멤버 멘션
                </p>
                {filteredMembers.map((member, i) => (
                  <button
                    key={member.id}
                    onClick={() => insertMention(member.name)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                      i === mentionIndex
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {/* 멤버 아바타 */}
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-600 dark:text-neutral-200">
                      {member.name[0]}
                    </div>
                    <span>{member.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-end gap-2">
            {/* 파일 첨부 버튼 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              title="파일 첨부"
            >
              <Paperclip size={18} />
            </button>
            {/* 숨겨진 파일 입력 */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFileSelect(e.target.files)
                e.target.value = ''
              }}
            />

            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              rows={1}
              className="max-h-24 flex-1 resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:placeholder:text-neutral-500 dark:focus:ring-primary-900"
            />

            {/* 이모지 피커 버튼 */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker((v) => !v)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  showEmojiPicker
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
                }`}
                title="이모지 선택"
              >
                <Smile size={18} />
              </button>
              {/* 이모지 피커 팝업 */}
              {showEmojiPicker && (
                <>
                  {/* 백드롭 (클릭 시 닫기) */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div className="absolute bottom-11 right-0 z-50 w-64 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-600 dark:bg-neutral-800">
                    <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase text-neutral-400">
                      이모지 선택
                    </p>
                    <div className="grid grid-cols-8 gap-0.5">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => insertEmoji(emoji)}
                          className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          title="이모지 삽입"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 메시지 전송 버튼 (목업 — 로컬 상태에 추가 후 토스트) */}
            <button
              onClick={handleSend}
              disabled={!message.trim() && attachedFiles.length === 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-primary-600 dark:hover:bg-primary-700"
              title="메시지 전송"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ====== 우측: 스레드 패널 (350px, 조건부 표시) ====== */}
      {/* 모바일: 풀스크린 오버레이 / 데스크톱: 사이드 패널 */}
      {activeThreadId && threadParentMessage && (
        <>
          {/* 모바일 백드롭 (md 이하에서만 표시) */}
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={closeThread}
          />
          <aside
            className={`
              fixed inset-0 z-50 flex flex-col bg-white dark:bg-surface-dark
              md:static md:z-auto md:w-[350px] md:shrink-0 md:border-l md:border-neutral-200 md:dark:border-neutral-700
            `}
          >
            {/* 스레드 패널 헤더 */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                  스레드
                </h3>
                <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">
                  {threadParentMessage.userName}: {threadParentMessage.content}
                </p>
              </div>
              {/* 스레드 패널 닫기 버튼 */}
              <button
                onClick={closeThread}
                className="ml-2 shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                title="스레드 닫기"
              >
                <X size={18} />
              </button>
            </div>

            {/* 스레드 메시지 리스트 */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-3">
                {/* 원본 메시지 (스레드 상단에 표시) */}
                <div className="border-b border-neutral-100 pb-3 dark:border-neutral-700">
                  {renderMessageBubble(threadParentMessage)}
                </div>

                {/* 답글 수 구분선 */}
                {currentThreadReplies.length > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
                    <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                      {currentThreadReplies.length}개 답글
                    </span>
                    <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                )}

                {/* 스레드 답글 메시지 목록 */}
                {currentThreadReplies.map((reply) =>
                  renderMessageBubble(reply),
                )}

                {/* 스레드 자동 스크롤 앵커 */}
                <div ref={threadMessagesEndRef} />
              </div>
            </div>

            {/* 스레드 메시지 입력창 */}
            <div className="shrink-0 border-t border-neutral-200 px-3 py-3 pb-14 md:pb-3 dark:border-neutral-700">
              <div className="flex items-end gap-2">
                <textarea
                  ref={threadTextareaRef}
                  value={threadMessage}
                  onChange={(e) => setThreadMessage(e.target.value)}
                  onKeyDown={handleThreadKeyDown}
                  placeholder="답글을 입력하세요..."
                  rows={1}
                  className="max-h-20 flex-1 resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:placeholder:text-neutral-500 dark:focus:ring-primary-900"
                />

                {/* 스레드 이모지 피커 버튼 */}
                <div className="relative">
                  <button
                    onClick={() => setShowThreadEmojiPicker((v) => !v)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      showThreadEmojiPicker
                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
                    }`}
                    title="스레드 이모지 선택"
                  >
                    <Smile size={16} />
                  </button>
                  {/* 스레드 이모지 피커 팝업 */}
                  {showThreadEmojiPicker && (
                    <>
                      {/* 백드롭 (클릭 시 닫기) */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowThreadEmojiPicker(false)}
                      />
                      <div className="absolute bottom-11 right-0 z-50 w-56 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-600 dark:bg-neutral-800">
                        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase text-neutral-400">
                          이모지 선택
                        </p>
                        <div className="grid grid-cols-8 gap-0.5">
                          {EMOJI_LIST.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => insertThreadEmoji(emoji)}
                              className="flex h-6 w-6 items-center justify-center rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                              title="스레드 이모지 삽입"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 스레드 메시지 전송 버튼 */}
                <button
                  onClick={handleThreadSend}
                  disabled={!threadMessage.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-primary-600 dark:hover:bg-primary-700"
                  title="스레드 답글 전송"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

/* ── 채널/DM 목록 아이템 ── */

function ChannelItem({
  channel,
  active,
  onSelect,
}: {
  channel: MockChatChannel
  active: boolean
  onSelect: (id: string) => void
}) {
  return (
    /* 채널/DM 선택 버튼 — 클릭 시 해당 채널로 전환 */
    <button
      onClick={() => onSelect(channel.id)}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
          : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
      }`}
    >
      {channel.type === 'dm' ? (
        /* DM 아바타 (상대방 이름 첫 글자) */
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-600 dark:text-neutral-200">
          {channel.dmUser?.[0]}
        </div>
      ) : (
        <Hash size={16} className="shrink-0 text-neutral-400" />
      )}
      <span className="flex-1 truncate text-left">
        {channel.type === 'dm' ? channel.dmUser : channel.name}
      </span>
      {channel.channelName && channel.type !== 'dm' && (
        <span className="hidden truncate text-[10px] text-neutral-400 lg:inline">
          {channel.channelName}
        </span>
      )}
      {/* 읽지 않은 메시지 배지 */}
      {channel.unread > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
          {channel.unread}
        </span>
      )}
    </button>
  )
}
