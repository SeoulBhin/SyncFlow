import { useState, useRef, useEffect, useMemo } from 'react'
import {
  X, Send, Plus, Bot, User, History, Sparkles,
  FolderOpen, FileCode, FileText, RefreshCw, ChevronDown,
  CheckCircle2, AtSign, Database, Lightbulb,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAIStore } from '@/stores/useAIStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import type { AIMessage, AIConversation, ProjectFile } from '@/stores/useAIStore'

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: number) {
  const diff = Date.now() - ts
  if (diff < 86400000) return '오늘'
  if (diff < 172800000) return '어제'
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function formatTimeAgo(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60000) return '방금 전'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`
  return `${Math.floor(diff / 86400000)}일 전`
}

/* ─── 마크다운 렌더링 ─── */

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let codeKey = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${codeKey++}`} className="my-2 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs text-green-300 dark:bg-neutral-950">
            <code>{codeLines.join('\n')}</code>
          </pre>,
        )
        codeLines = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) { codeLines.push(line); continue }
    elements.push(<MarkdownLine key={i} line={line} />)
  }
  return elements
}

function MarkdownLine({ line }: { line: string }) {
  if (!line.trim()) return <br />
  const listMatch = line.match(/^(\d+\.\s|-\s)(.*)/)
  if (listMatch) {
    return (
      <div className="flex gap-1.5 pl-2">
        <span className="shrink-0 text-neutral-400">{listMatch[1].startsWith('-') ? '\u2022' : listMatch[1]}</span>
        <span>{renderInline(listMatch[2])}</span>
      </div>
    )
  }
  return <p>{renderInline(line)}</p>
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-neutral-200 px-1 py-0.5 text-xs dark:bg-neutral-700">{part.slice(1, -1)}</code>
    }
    return part
  })
}

/* ─── 메시지 말풍선 ─── */

function MessageBubble({ msg }: { msg: AIMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        isUser
          ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400'
          : 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
      )}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={cn(
        'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-primary-600 text-white dark:bg-primary-700'
          : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100',
      )}>
        {msg.referencedFiles && msg.referencedFiles.length > 0 && (
          <div className={cn('mb-1.5 flex flex-wrap gap-1', isUser ? 'opacity-80' : '')}>
            {msg.referencedFiles.map((f) => (
              <span key={f} className={cn(
                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium',
                isUser
                  ? 'bg-white/20 text-white'
                  : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
              )}>
                <FileCode size={9} />{f}
              </span>
            ))}
          </div>
        )}
        <div className="space-y-1">
          {isUser ? msg.content : renderMarkdown(msg.content)}
          {msg.isStreaming && <span className="inline-block h-4 w-1 animate-pulse bg-current" />}
        </div>
        <p className={cn('mt-1.5 text-[10px]', isUser ? 'text-primary-200' : 'text-neutral-400 dark:text-neutral-500')}>
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </div>
  )
}

/* ─── 대화 히스토리 항목 ─── */

function ConversationItem({ conv, active, onClick }: { conv: AIConversation; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      'w-full rounded-lg px-3 py-2 text-left transition-colors',
      active ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
    )}>
      <p className="truncate text-sm font-medium">{conv.title}</p>
      <p className="mt-0.5 truncate text-xs text-neutral-400">{conv.lastMessage || '새 대화'}</p>
      <p className="mt-0.5 text-[10px] text-neutral-400">{formatDate(conv.timestamp)}</p>
    </button>
  )
}

/* ─── 프로젝트 컨텍스트 선택기 ─── */

function ProjectSelector() {
  const { activeProject, projects, setActiveProject, reindexProject } = useAIStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!activeProject) return null

  return (
    <div ref={ref} className="relative border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(!open)}
          className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
        >
          <Database size={13} className="shrink-0 text-violet-500" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              {activeProject.groupName} / {activeProject.name}
            </p>
            <p className="text-[10px] text-neutral-400">
              {activeProject.files.length}개 파일 인덱싱됨
              {activeProject.indexedAt && ` \u00B7 ${formatTimeAgo(activeProject.indexedAt)}`}
            </p>
          </div>
          <ChevronDown size={12} className={cn('shrink-0 text-neutral-400 transition-transform', open && 'rotate-180')} />
        </button>
        <button
          onClick={reindexProject}
          disabled={activeProject.isIndexing}
          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-violet-600 disabled:opacity-50 dark:hover:bg-neutral-700 dark:hover:text-violet-400"
          title="프로젝트 다시 인덱싱"
        >
          <RefreshCw size={13} className={cn(activeProject.isIndexing && 'animate-spin')} />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-3 right-3 z-50 mt-1 rounded-lg border border-neutral-200 bg-surface py-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-800">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => { setActiveProject(p.id); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700',
                p.id === activeProject.id ? 'text-violet-600 font-medium dark:text-violet-400' : 'text-neutral-600 dark:text-neutral-300',
              )}
            >
              <FolderOpen size={12} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.groupName} / {p.name}</p>
                <p className="text-[10px] text-neutral-400">{p.files.length}개 파일</p>
              </div>
              {p.id === activeProject.id && <CheckCircle2 size={12} className="text-violet-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── 파일 참조 멘션 드롭다운 ─── */

function FileMentionDropdown({ query, onSelect }: { query: string; onSelect: (file: ProjectFile) => void }) {
  const activeProject = useAIStore((s) => s.activeProject)
  if (!activeProject) return null

  const filtered = activeProject.files.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()) || f.path.toLowerCase().includes(query.toLowerCase()),
  )

  if (filtered.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-lg border border-neutral-200 bg-surface py-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-800">
      <p className="px-3 py-1 text-[10px] font-medium text-neutral-400">파일 참조 (@파일명)</p>
      {filtered.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f)}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
        >
          {f.type === 'code' ? <FileCode size={12} className="shrink-0 text-blue-500" /> : <FileText size={12} className="shrink-0 text-amber-500" />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-neutral-700 dark:text-neutral-200">{f.name}</p>
            <p className="truncate text-[10px] text-neutral-400">{f.path}</p>
          </div>
          {f.language && <span className="shrink-0 text-[10px] text-neutral-400">{f.language}</span>}
        </button>
      ))}
    </div>
  )
}

/* ─── 선택된 파일 태그 목록 ─── */

function SelectedFileTags() {
  const { selectedFiles, activeProject, toggleFileSelection } = useAIStore()
  if (selectedFiles.length === 0 || !activeProject) return null

  return (
    <div className="flex flex-wrap gap-1 px-4 pb-1">
      {selectedFiles.map((fId) => {
        const file = activeProject.files.find((f) => f.id === fId)
        if (!file) return null
        return (
          <button
            key={fId}
            onClick={() => toggleFileSelection(fId)}
            className="flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 transition-colors hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/60"
          >
            <FileCode size={10} />
            {file.name}
            <X size={10} className="ml-0.5" />
          </button>
        )
      })}
    </div>
  )
}

/* ─── 프로젝트 파일 탐색기 ─── */

function ProjectFilesView() {
  const activeProject = useAIStore((s) => s.activeProject)
  if (!activeProject) return null

  const grouped = activeProject.files.reduce<Record<string, ProjectFile[]>>((acc, f) => {
    const dir = f.path.includes('/') ? f.path.split('/').slice(0, -1).join('/') : '/'
    ;(acc[dir] ??= []).push(f)
    return acc
  }, {})

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <p className="mb-2 px-2 text-xs font-medium text-neutral-400">
        인덱싱된 파일 ({activeProject.files.length})
      </p>
      {Object.entries(grouped).map(([dir, files]) => (
        <div key={dir} className="mb-2">
          <p className="mb-1 flex items-center gap-1 px-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <FolderOpen size={11} />
            {dir}
          </p>
          {files.map((f) => (
            <div key={f.id} className="group rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700">
              <div className="flex items-center gap-2">
                {f.type === 'code'
                  ? <FileCode size={12} className="shrink-0 text-blue-500" />
                  : <FileText size={12} className="shrink-0 text-amber-500" />}
                <span className="flex-1 truncate text-xs font-medium text-neutral-700 dark:text-neutral-200">
                  {f.name}
                </span>
                {f.language && <span className="text-[10px] text-neutral-400">{f.language}</span>}
                {f.indexed && <CheckCircle2 size={10} className="text-green-500" />}
              </div>
              {f.preview && (
                <p className="mt-0.5 truncate pl-5 text-[10px] text-neutral-400">{f.preview}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ─── 메인 사이드패널 ─── */

type Tab = 'chat' | 'history' | 'files'

export function AISidePanel() {
  const {
    messages, conversations, activeConversationId, isLoading, usage, activeProject,
    sendMessage, selectConversation, newConversation,
    selectedFiles, toggleFileSelection,
  } = useAIStore()
  const { closePanel } = useDetailPanelStore()

  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMention, setShowMention] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    if (usage.daily.used >= usage.daily.limit) return

    const fileNames = selectedFiles.map((fId) => {
      const file = activeProject?.files.find((f) => f.id === fId)
      return file?.name ?? fId
    })

    // 입력 텍스트에서 @파일명 패턴도 추출
    const mentionMatches = trimmed.match(/@([\w가-힣.]+)/g)
    if (mentionMatches) {
      mentionMatches.forEach((m) => {
        const name = m.slice(1)
        if (!fileNames.includes(name)) fileNames.push(name)
      })
    }

    sendMessage(trimmed, fileNames.length > 0 ? fileNames : undefined)
    setInput('')
    setShowMention(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    // @ 파일 멘션 감지
    const atMatch = value.match(/@([\w가-힣.]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setShowMention(true)
    } else {
      setShowMention(false)
    }
  }

  const handleMentionSelect = (file: ProjectFile) => {
    // @ 뒤의 텍스트를 파일명으로 교체
    const newInput = input.replace(/@[\w가-힣.]*$/, `@${file.name} `)
    setInput(newInput)
    toggleFileSelection(file.id)
    setShowMention(false)
    inputRef.current?.focus()
  }

  const dailyPercent = Math.min((usage.daily.used / usage.daily.limit) * 100, 100)
  const isOverLimit = usage.daily.used >= usage.daily.limit

  const emptyPrompts = useMemo(() => {
    if (!activeProject) return []
    const files = activeProject.files.filter((f) => f.type === 'code')
    const first = files[0]?.name ?? '코드'
    return [
      `@${first} 이 코드를 리뷰해줘`,
      '프로젝트 전체 구조를 설명해줘',
      '버그가 있는 부분을 찾아줘',
    ]
  }, [activeProject])

  return (
    <div className="flex h-full w-full flex-col bg-surface dark:bg-surface-dark">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500" />
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">AI 어시스턴트</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={newConversation} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200" title="새 대화">
            <Plus size={16} />
          </button>
          <button onClick={closePanel} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 프로젝트 컨텍스트 */}
      <ProjectSelector />

      {/* 탭 */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700">
        {([
          { key: 'chat' as Tab, icon: Bot, label: '채팅' },
          { key: 'files' as Tab, icon: FolderOpen, label: '파일' },
          { key: 'history' as Tab, icon: History, label: '기록' },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors',
              activeTab === key
                ? 'border-b-2 border-violet-500 text-violet-600 dark:text-violet-400'
                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300',
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* 사용량 배너 */}
      {isOverLimit && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          일일 사용 한도({usage.daily.limit}회)에 도달했습니다. 내일 다시 이용해주세요.
        </div>
      )}

      {/* 사용량 미니 바 */}
      {activeTab === 'chat' && (
        <div className="border-b border-neutral-200 px-4 py-1.5 dark:border-neutral-700">
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span>오늘 {usage.daily.used}/{usage.daily.limit}</span>
            <span>이번 달 {usage.monthly.used}/{usage.monthly.limit}</span>
          </div>
          <div className="mt-0.5 h-0.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div
              className={cn('h-full rounded-full transition-all', dailyPercent >= 90 ? 'bg-red-500' : dailyPercent >= 70 ? 'bg-amber-500' : 'bg-violet-500')}
              style={{ width: `${dailyPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 탭 콘텐츠 */}
      {activeTab === 'files' && <ProjectFilesView />}

      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="mb-2 px-2 text-xs font-medium text-neutral-400">이전 대화</p>
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeConversationId}
              onClick={() => { selectConversation(conv.id); setActiveTab('chat') }}
            />
          ))}
        </div>
      )}

      {activeTab === 'chat' && (
        <>
          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-400">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                  <Bot size={28} className="text-violet-500" />
                </div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  프로젝트를 이해하는 AI
                </p>
                <p className="text-center text-xs text-neutral-400">
                  <span className="font-medium text-violet-500">@파일명</span>으로 특정 파일을 참조하여{'\n'}
                  코드 리뷰, 버그 분석, 리팩토링을 요청하세요
                </p>
                <div className="mt-2 w-full space-y-2">
                  {emptyPrompts.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="block w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-xs text-neutral-500 transition-colors hover:border-violet-300 hover:text-violet-600 dark:border-neutral-700 dark:hover:border-violet-600 dark:hover:text-violet-400"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            <div ref={messagesEndRef} />
          </div>

          {/* 선택된 파일 태그 */}
          <SelectedFileTags />

          {/* 제안 칩 */}
          {messages.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-1">
              <Lightbulb size={12} className="mt-0.5 shrink-0 text-amber-400" />
              {['이 문서 요약해줘', '마감 임박 작업 정리해줘', '코드 리뷰해줘'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion)
                    inputRef.current?.focus()
                  }}
                  className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-medium text-violet-600 transition-colors hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* 입력 영역 */}
          <div className="relative border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
            {showMention && <FileMentionDropdown query={mentionQuery} onSelect={handleMentionSelect} />}
            <div className="flex items-end gap-2">
              <button
                onClick={() => { setInput(input + '@'); setShowMention(true); setMentionQuery(''); inputRef.current?.focus() }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-violet-600 dark:hover:bg-neutral-700 dark:hover:text-violet-400"
                title="파일 참조 (@)"
              >
                <AtSign size={16} />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isOverLimit ? '일일 한도 초과' : '@파일명으로 참조하여 질문하세요'}
                disabled={isOverLimit}
                rows={1}
                className="max-h-24 flex-1 resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:focus:ring-violet-900"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || isOverLimit}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
