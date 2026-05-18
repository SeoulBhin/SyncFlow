import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Send,
  Smile,
  Paperclip,
  CheckCheck,
  MessageCircle,
  MessageSquare,
  X,
  Hash,
  Reply,
  CheckSquare,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { apiFetch } from '@/lib/api'
import { useChatStore } from '@/stores/useChatStore'
import { useChannelsStore } from '@/stores/useChannelsStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useThreadStore } from '@/stores/useThreadStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useProjectsStore } from '@/stores/useProjectsStore'
import { useAIStore } from '@/stores/useAIStore'
import { ChannelHeader } from '@/components/channel/ChannelHeader'
import { ExternalChannelBanner } from '@/components/channel/ExternalChannelBanner'
import {
  EMOJI_LIST,
  MOCK_CHANNELS,
  MOCK_ORG_MEMBERS,
} from '@/constants'
import type { ChatMessage } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// Splits content into text segments and file-link segments ([📎 name](url))
const FILE_LINK_RE = /\[📎 ([^\]]+)\]\(([^)]+)\)/g

function renderContent(content: string, isOwn: boolean) {
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null

  FILE_LINK_RE.lastIndex = 0
  while ((m = FILE_LINK_RE.exec(content)) !== null) {
    if (m.index > last) {
      parts.push(content.slice(last, m.index))
    }
    const [, name, url] = m
    parts.push(
      <a
        key={m.index}
        href={url}
        download={name}
        rel="noopener noreferrer"
        className={`mt-1 flex items-center gap-1 rounded px-2 py-1 text-xs underline-offset-2 hover:underline ${
          isOwn
            ? 'bg-primary-600/30 text-white'
            : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200'
        }`}
      >
        <Paperclip size={11} className="shrink-0" />
        {name}
      </a>,
    )
    last = m.index + m[0].length
  }

  if (last < content.length) {
    parts.push(content.slice(last))
  }

  return parts
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChannelView() {
  const {
    channels,
    messages,
    activeChannelId,
    typingUsers,
    isLoading,
    hasMore,
    loadChannels,
    setActiveChannel,
    loadMoreMessages,
    sendMessage,
    sendTyping,
    addReaction,
    deleteMessage,
    initSocket,
    cleanupSocket,
  } = useChatStore()

  const { activeGroupId, activeOrgId, setActiveGroup: setActiveGroupCtx } = useGroupContextStore()
  const navigate = useNavigate()
  const { setActiveGroup: setSidebarActiveGroup, setActiveProject: setSidebarActiveProject } = useSidebarStore()
  const projects = useProjectsStore((s) => s.projects)
  const allChannelDetails = useChannelsStore((s) => s.channels)
  const { openThread } = useThreadStore()
  const { openPanel } = useDetailPanelStore()
  const { openPanel: openAIPanel, sendMessage: sendAIMessage } = useAIStore()

  const [inputText, setInputText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  /** 선택 즉시 업로드 완료된 [📎 이름](url) 링크 목록 */
  const [pendingLinks, setPendingLinks] = useState<string[]>([])
  /** 현재 업로드 중인 파일명 목록 */
  const [uploadingFileNames, setUploadingFileNames] = useState<string[]>([])
  /** 채널 멤버 목록 (멘션용) */
  const [channelMembers, setChannelMembers] = useState<Array<{ id: string; name: string; position: string }>>([])

  useEffect(() => {
    if (!activeChannelId) return
    apiFetch(`/api/channels/${activeChannelId}/members`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<{ userId: string; userName: string }>) => {
        setChannelMembers(
          data.map((m) => ({ id: m.userId, name: m.userName, position: '멤버' })),
        )
      })
      .catch(() => setChannelMembers([]))
  }, [activeChannelId])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // URL의 :channelId param을 useChatStore에 동기화 — 직접 진입/새로고침에도 작동
  const { channelId: urlChannelId } = useParams<{ channelId: string }>()
  useEffect(() => {
    if (urlChannelId && urlChannelId !== activeChannelId) {
      setActiveChannel(urlChannelId)
    }
  }, [urlChannelId, activeChannelId, setActiveChannel])

  // 채널 진입 시 markRead — 사이드바 unread 배지 즉시 0
  const markChannelRead = useChannelsStore((s) => s.markChannelRead)
  useEffect(() => {
    if (!urlChannelId) return
    void apiFetch(`/api/channels/${urlChannelId}/read`, { method: 'PUT' }).catch(() => {})
    markChannelRead(urlChannelId)
  }, [urlChannelId, markChannelRead])

  // ── Socket init / cleanup ─────────────────────────────────────────────────

  useEffect(() => {
    initSocket()
    return () => cleanupSocket()
  }, [initSocket, cleanupSocket])

  // ── Channel load when group changes ───────────────────────────────────────

  useEffect(() => {
    if (activeOrgId) {
      void loadChannels(activeOrgId)
    }
  }, [activeOrgId, loadChannels])

  // 현재 보고 있는 채널이 삭제됐을 때(채널 목록에서 사라졌을 때) 첫 번째 일반 채널로 이동
  useEffect(() => {
    if (!urlChannelId || channels.length === 0) return
    const exists = channels.find((c) => c.id === urlChannelId)
    if (!exists) {
      const first = channels.find((c) => c.type === 'channel') ?? channels[0]
      if (first) navigate(`/app/channel/${first.id}`)
      else navigate('/app')
    }
  }, [channels, urlChannelId, navigate])

  // ── Scroll to bottom ──────────────────────────────────────────────────────

  const activeMessages = activeChannelId ? (messages[activeChannelId] ?? []) : []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length, activeChannelId])

  // ── Outside click: close emoji picker ────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Derived: typing users for current channel ─────────────────────────────

  const channelTypingUsers = useMemo(
    () =>
      activeChannelId
        ? typingUsers.filter((t) => t.channelId === activeChannelId)
        : [],
    [typingUsers, activeChannelId],
  )

  // ── Channel / ProjectChat / DM split ─────────────────────────────────────

  const regularChannels = channels.filter((c) => c.type !== 'dm' && c.type !== 'project')
  const dmChannels = channels.filter((c) => c.type === 'dm')
  const activeChannel = channels.find((c) => c.id === activeChannelId)

  // 현재 활성 채널이 일반 채널(type='channel')이면 그 채널에 소속된 프로젝트 채팅만 표시
  // 일반 채널이 아닌 경우(프로젝트 채팅 등) 전체 프로젝트 채팅 표시
  const activeRegularChannelId = activeChannel?.type === 'channel' ? activeChannelId : null
  const projectChannels = channels.filter((c) => {
    if (c.type !== 'project') return false
    if (!activeRegularChannelId) return true // 일반 채널 컨텍스트 없으면 전부 표시
    const detail = allChannelDetails.find((d) => d.id === c.id)
    if (!detail?.projectId) return true
    const project = projects.find((p) => p.id === detail.projectId)
    if (!project) return true
    if (!project.channelId) return true // channelId 없는 레거시 프로젝트는 항상 표시
    return project.channelId === activeRegularChannelId
  })

  // ── Mention list ──────────────────────────────────────────────────────────

  const allMentionItems = [
    { id: 'ai', name: 'AI', position: 'AI 어시스턴트', isAI: true },
    ...channelMembers.map((m) => ({ ...m, isAI: false })),
  ]
  const filteredMembers = allMentionItems.filter((m) =>
    m.name.toLowerCase().includes(mentionFilter.toLowerCase()),
  )

  // ── Navigation helpers (store + URL 동기화) ───────────────────────────────

  const openChannel = useCallback((channelId: string, channelName: string) => {
    setActiveGroupCtx(channelId, channelName)
    setSidebarActiveGroup(channelId)
    setActiveChannel(channelId)
    navigate(`/app/channel/${channelId}`)
  }, [setActiveGroupCtx, setSidebarActiveGroup, setActiveChannel, navigate])

  const openProjectChat = useCallback((channelId: string, channelName: string) => {
    const detail = allChannelDetails.find((c) => c.id === channelId)
    const projectId = detail?.projectId ?? null
    setActiveGroupCtx(channelId, channelName)
    if (projectId) setSidebarActiveProject(projectId)
    setActiveChannel(channelId)
    navigate(`/app/channel/${channelId}`)
  }, [allChannelDetails, setActiveGroupCtx, setSidebarActiveProject, setActiveChannel, navigate])

  const openDM = useCallback((dmId: string, dmName: string) => {
    setActiveGroupCtx(dmId, dmName)
    setSidebarActiveGroup(dmId)
    setActiveChannel(dmId)
    navigate(`/app/channel/${dmId}`)
  }, [setActiveGroupCtx, setSidebarActiveGroup, setActiveChannel, navigate])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el || !activeChannelId || isLoading) return
    if (el.scrollTop < 100 && (hasMore[activeChannelId] ?? false)) {
      prevScrollHeightRef.current = el.scrollHeight
      void loadMoreMessages(activeChannelId)
    }
  }, [activeChannelId, hasMore, isLoading, loadMoreMessages])

  useLayoutEffect(() => {
    const el = scrollContainerRef.current
    if (!el || prevScrollHeightRef.current === 0) return
    el.scrollTop = el.scrollHeight - prevScrollHeightRef.current
    prevScrollHeightRef.current = 0
  }, [activeMessages.length])

  const handleSend = useCallback(() => {
    // 업로드 중이거나 보낼 내용이 없으면 전송 불가
    if (uploadingFileNames.length > 0) return
    if ((!inputText.trim() && pendingLinks.length === 0) || !activeChannelId) return

    const content = [inputText.trim(), ...pendingLinks].filter(Boolean).join('\n')
    if (!content.trim()) return

    // @AI 멘션 감지: AI 패널로 전달 (channelId 포함하여 멤버 목록 hallucination 방지)
    const hasAIMention = /@AI\b/i.test(inputText.trim())
    if (hasAIMention) {
      const aiQuery = inputText.trim().replace(/@AI\s*/gi, '').trim() || inputText.trim()
      openPanel('ai')
      openAIPanel()
      void sendAIMessage(aiQuery, undefined, activeChannelId ?? undefined)
    }

    sendMessage(activeChannelId, content)
    setInputText('')
    setPendingLinks([])
  }, [inputText, pendingLinks, uploadingFileNames, activeChannelId, sendMessage, openPanel, openAIPanel, sendAIMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInputText(val)

    // Typing indicator
    if (activeChannelId) {
      sendTyping(activeChannelId)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        typingTimerRef.current = null
      }, 2000)
    }

    // @mention detection
    const cursorPos = e.target.selectionStart ?? val.length
    const match = val.slice(0, cursorPos).match(/@([^\s]*)$/)
    if (match) {
      setMentionFilter(match[1])
      setShowMentionList(true)
    } else {
      setShowMentionList(false)
    }
  }

  const insertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji)
    setShowEmojiPicker(false)
    textareaRef.current?.focus()
  }

  const insertMention = (name: string) => {
    const pos = textareaRef.current?.selectionStart ?? inputText.length
    const before = inputText.slice(0, pos).replace(/@([^\s]*)$/, `@${name} `)
    setInputText(before + inputText.slice(pos))
    setShowMentionList(false)
    textareaRef.current?.focus()
  }

  const handleOpenThread = useCallback(
    (msg: ChatMessage) => {
      openThread(msg.id, msg)
      openPanel('thread')
    },
    [openThread, openPanel],
  )

  const handleReaction = useCallback(
    (msgId: string, emoji: string) => {
      if (!activeChannelId) return
      addReaction(msgId, emoji, activeChannelId)
    },
    [activeChannelId, addReaction],
  )

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id)
    setEditText(msg.content)
  }

  const handleCancelEdit = () => {
    setEditingMsgId(null)
    setEditText('')
  }

  const handleCommitEdit = async () => {
    if (!editingMsgId || !editText.trim()) return
    const { updateMessage } = useChatStore.getState()
    try {
      await updateMessage(editingMsgId, editText.trim())
    } finally {
      setEditingMsgId(null)
      setEditText('')
    }
  }

  const handleDelete = (msg: ChatMessage) => {
    if (!window.confirm('메시지를 삭제하시겠습니까?')) return
    void deleteMessage(msg.id, msg.channelId)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)
    // 같은 파일을 다시 선택해도 onChange가 동작하도록 즉시 초기화
    e.target.value = ''

    // 파일 선택 즉시 업로드 시작 (fire-and-forget)
    void (async () => {
      const names = files.map((f) => f.name)
      setUploadingFileNames((prev) => [...prev, ...names])

      const results = await Promise.allSettled(
        files.map(async (file) => {
          const form = new FormData()
          form.append('file', file)
          const res = await apiFetch('/api/upload', { method: 'POST', body: form })
          if (!res.ok) {
            const errText = await res.text().catch(() => res.statusText)
            throw new Error(`${file.name}: ${errText || `HTTP ${res.status}`}`)
          }
          const data: { fileUrl: string; fileName: string } = await res.json()
          return `[📎 ${data.fileName}](${data.fileUrl})`
        }),
      )

      setUploadingFileNames((prev) => prev.filter((n) => !names.includes(n)))

      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      )
      if (failed.length > 0) {
        const reasons = failed.map((r) => (r.reason as Error).message).join('\n')
        console.error('[ChannelView] 파일 업로드 실패:', reasons)
        alert(`파일 업로드에 실패했습니다:\n${reasons}`)
      }

      const links = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value)
      if (links.length > 0) {
        setPendingLinks((prev) => [...prev, ...links])
      }
    })()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* 좌측: 채널 / DM 목록 */}
      <div className="hidden w-[220px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 sm:flex">
        {/* 헤더는 사이드바/메시지패널/스레드패널과 같은 h-14 라인에 맞춤 */}
        <div className="flex h-14 shrink-0 items-center border-b border-neutral-200 px-4 dark:border-neutral-700">
          <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
            메시지
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* 일반 채널 목록 */}
          {regularChannels.length > 0 && (
            <div className="mb-2">
              <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                채널
              </p>
              {regularChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => openChannel(ch.id, ch.name)}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-1.5 text-xs transition-colors',
                    ch.id === activeChannelId
                      ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  )}
                >
                  <Hash size={13} className="shrink-0" />
                  <span className="flex-1 truncate text-left">{ch.name}</span>
                  {ch.unreadCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {ch.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 프로젝트 채팅 목록 */}
          {projectChannels.length > 0 && (
            <div className="mb-2">
              <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                프로젝트 채팅
              </p>
              {projectChannels.map((ch) => {
                const detail = allChannelDetails.find((c) => c.id === ch.id)
                const project = detail?.projectId
                  ? projects.find((p) => p.id === detail.projectId)
                  : null
                const label = project?.name ?? ch.name
                return (
                  <button
                    key={ch.id}
                    onClick={() => openProjectChat(ch.id, ch.name)}
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-1.5 text-xs transition-colors',
                      ch.id === activeChannelId
                        ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                    )}
                  >
                    <MessageSquare size={13} className="shrink-0 text-primary-500" />
                    <span className="flex-1 truncate text-left">{label}</span>
                    {ch.unreadCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {ch.unreadCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* DM 목록 */}
          {dmChannels.length > 0 && (
            <div>
              <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                DM
              </p>
              {dmChannels.map((dm) => {
                // DM 채널의 row.name 은 처음 만든 사람이 입력한 값이라 양쪽 입장이 어긋남.
                // 본인 입장의 상대 이름(otherUser.userName)을 항상 우선 사용.
                const displayName = dm.otherUser?.userName?.trim() || dm.name || 'DM'
                return (
                  <button
                    key={dm.id}
                    onClick={() => openDM(dm.id, displayName)}
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-1.5 text-xs transition-colors',
                      dm.id === activeChannelId
                        ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                    )}
                  >
                    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-[9px] font-bold text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200">
                      {displayName[0] ?? '?'}
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-[1.5px] border-neutral-50 bg-neutral-400 dark:border-neutral-900" />
                    </span>
                    <span className="flex-1 truncate text-left">{displayName}</span>
                    {dm.unreadCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {dm.unreadCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* 로딩 / 빈 상태 */}
          {channels.length === 0 && isLoading && (
            <div className="flex items-center justify-center py-8 text-neutral-400">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
          {channels.length === 0 && !isLoading && (
            <p className="px-4 py-4 text-xs text-neutral-400">
              채널이 없습니다
            </p>
          )}
        </div>
      </div>

      {/* 우측: 메시지 피드 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChannelHeader />

        {activeGroupId && (
          <ExternalChannelBanner channelId={activeGroupId} />
        )}

        {/* 메시지 목록 */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4">
          {!activeChannelId ? (
            <div className="flex h-full items-center justify-center text-neutral-400">
              <p className="text-sm">채널을 선택하세요</p>
            </div>
          ) : isLoading && activeMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-neutral-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : activeMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-neutral-400">
              <div className="text-center">
                <p className="text-lg font-medium">
                  #{activeChannel?.name ?? '채널'}
                </p>
                <p className="mt-1 text-sm">이 채널의 시작입니다. 첫 메시지를 보내보세요!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMessages.map((msg) => {
                // External channel member badge (kept from original)
                const currentChannel = activeGroupId
                  ? MOCK_CHANNELS.find((c) => c.id === activeGroupId)
                  : null
                const isExternalChannel = currentChannel?.isExternal
                const memberData =
                  isExternalChannel && activeGroupId
                    ? (
                        MOCK_ORG_MEMBERS as Record<
                          string,
                          { id: string; orgId: string; orgName: string }[]
                        >
                      )[activeGroupId]?.find((m) => m.id === msg.authorId)
                    : null
                const isExternalMember =
                  memberData?.orgId && memberData.orgId !== 'org1'

                return (
                  <div
                    key={msg.id}
                    className={`group relative flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    {/* Hover action bar */}
                    {hoveredMsgId === msg.id && editingMsgId !== msg.id && (
                      <div
                        className={cn(
                          'absolute -top-3 z-10 flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white px-1 py-0.5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800',
                          msg.isOwn ? 'right-0' : 'left-0',
                        )}
                      >
                        <button
                          onClick={() => handleOpenThread(msg)}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-primary-500 dark:hover:bg-neutral-700"
                          title="답글 달기"
                        >
                          <Reply size={14} />
                        </button>
                        <button
                          onClick={() => handleReaction(msg.id, '👍')}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-amber-500 dark:hover:bg-neutral-700"
                          title="👍"
                        >
                          <Smile size={14} />
                        </button>
                        {msg.isOwn && (
                          <>
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-blue-500 dark:hover:bg-neutral-700"
                              title="수정"
                            >
                              <CheckSquare size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(msg)}
                              className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-500 dark:hover:bg-neutral-700"
                              title="삭제"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    <div className="max-w-[70%]">
                      {/* Author name */}
                      {!msg.isOwn && (
                        <p className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                          {msg.isSystem && (
                            <Sparkles
                              size={10}
                              className="text-violet-500"
                            />
                          )}
                          {msg.authorName}
                          {isExternalMember && memberData?.orgName && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-orange-100 px-1 py-px text-[9px] font-medium text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                              {memberData.orgName}
                            </span>
                          )}
                        </p>
                      )}

                      {/* Message bubble */}
                      {editingMsgId === msg.id ? (
                        <div className="flex flex-col gap-1">
                          <textarea
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                void handleCommitEdit()
                              }
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                            rows={2}
                            className="w-full resize-none rounded-lg border border-primary-300 bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-100 dark:bg-neutral-800"
                          />
                          <div className="flex gap-1 text-xs">
                            <button
                              onClick={() => void handleCommitEdit()}
                              className="rounded bg-primary-500 px-2 py-0.5 text-white"
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="rounded bg-neutral-200 px-2 py-0.5 dark:bg-neutral-700"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-2 text-sm',
                            msg.isOwn
                              ? 'rounded-br-sm bg-primary-500 text-white'
                              : msg.isSystem
                                ? 'rounded-bl-sm border border-violet-200 bg-violet-50 text-neutral-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-neutral-100'
                                : 'rounded-bl-sm bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100',
                          )}
                        >
                          {renderContent(msg.content, msg.isOwn ?? false)}
                        </div>
                      )}

                      {/* Reactions */}
                      {msg.reactions.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-0.5">
                          {msg.reactions.map((r) => (
                            <button
                              key={r.emoji}
                              onClick={() => handleReaction(msg.id, r.emoji)}
                              className="inline-flex items-center gap-0.5 rounded-full border border-neutral-200 bg-neutral-50 px-1 py-px text-[9px] transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                            >
                              {r.emoji}
                              <span className="text-neutral-500 dark:text-neutral-400">
                                {r.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Footer: time + read + thread */}
                      <div
                        className={cn(
                          'mt-0.5 flex items-center gap-1.5 text-[10px] text-neutral-400',
                          msg.isOwn ? 'justify-end' : 'justify-start',
                        )}
                      >
                        {msg.isOwn && (
                          <CheckCheck size={10} className="text-primary-400" />
                        )}
                        <span>{formatTime(msg.createdAt)}</span>
                        {msg.replyCount > 0 && (
                          <button
                            onClick={() => handleOpenThread(msg)}
                            className="flex items-center gap-0.5 text-primary-500 hover:underline"
                          >
                            <MessageCircle size={10} />
                            {msg.replyCount}개 답글
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {channelTypingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[70%]">
                    <p className="mb-0.5 text-[11px] font-medium text-neutral-500">
                      {channelTypingUsers.map((t) => t.userName).join(', ')}
                    </p>
                    <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-neutral-100 px-4 py-2 text-sm text-neutral-500 dark:bg-neutral-700">
                      <span className="text-xs">입력 중</span>
                      <span className="inline-flex gap-0.5">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="h-1 w-1 animate-bounce rounded-full bg-neutral-400"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
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
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                멤버 멘션
              </p>
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => insertMention(member.name)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  {member.isAI ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                      <Sparkles size={12} />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                      {member.name[0]}
                    </div>
                  )}
                  @{member.name}
                </button>
              ))}
            </div>
          )}

          {/* 파일 미리보기: 업로드 중 + 완료된 링크 */}
          {(uploadingFileNames.length > 0 || pendingLinks.length > 0) && (
            <div className="mb-2 flex flex-wrap gap-1">
              {/* 업로드 중 배지 */}
              {uploadingFileNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                >
                  <Loader2 size={10} className="animate-spin" />
                  <span className="max-w-[120px] truncate">{name}</span>
                </span>
              ))}
              {/* 업로드 완료된 링크 배지 */}
              {pendingLinks.map((link, idx) => {
                // [📎 name](url) 에서 name 추출
                const match = /\[📎 ([^\]]+)\]/.exec(link)
                const displayName = match ? match[1] : `파일 ${idx + 1}`
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                  >
                    <Paperclip size={10} />
                    <span className="max-w-[120px] truncate">{displayName}</span>
                    <button
                      onClick={() =>
                        setPendingLinks((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="rounded-full p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )
              })}
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
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                activeChannel
                  ? `#${activeChannel.name}에 메시지 보내기`
                  : '채널을 선택하세요'
              }
              disabled={!activeChannelId}
              rows={1}
              className="max-h-24 flex-1 resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:focus:ring-primary-900"
            />

            <button
              onClick={() => setShowEmojiPicker((v) => !v)}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                showEmojiPicker
                  ? 'bg-primary-100 text-primary-500 dark:bg-primary-900/40'
                  : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700',
              )}
              title="이모지"
            >
              <Smile size={16} />
            </button>

            <button
              onClick={handleSend}
              disabled={
                uploadingFileNames.length > 0 ||
                ((!inputText.trim() && pendingLinks.length === 0) || !activeChannelId)
              }
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
