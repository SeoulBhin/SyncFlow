import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table as TipTapTable } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Image as TipTapImage } from '@tiptap/extension-image'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Extension } from '@tiptap/core'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { common, createLowlight } from 'lowlight'
import {
  ArrowLeft,
  Save,
  History,
  ListTree,
  Cloud,
  CloudOff,
  Loader,
  Paperclip,
  Download as DownloadIcon,
  X,
} from 'lucide-react'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { PresenceAvatars } from '@/components/editor/PresenceAvatars'
import { LiveCursors } from '@/components/editor/LiveCursors'
import { ExportMenu } from '@/components/editor/ExportMenu'
import { VersionHistoryPanel } from '@/components/editor/VersionHistoryPanel'
import { TOCPanel } from '@/components/editor/TOCPanel'
import { ImageUploadModal } from '@/components/editor/ImageUploadModal'
import { SlashCommandMenu } from '@/components/editor/SlashCommandMenu'
import { TableToolbar } from '@/components/editor/TableToolbar'
import { CalloutBlock } from '@/components/editor/extensions/CalloutBlock'
import { ToggleBlock } from '@/components/editor/extensions/ToggleBlock'
import { SlashCommandExtension } from '@/components/editor/extensions/SlashCommandExtension'
import { useToastStore } from '@/stores/useToastStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { api } from '@/utils/api'
import { MOCK_PROJECTS } from '@/constants'

interface PageData {
  id: string
  name: string | null
  channelId: string | null
  content: string | null
}

interface AttachmentData {
  id: string
  pageId: string
  filename: string
  url: string
  mimeType: string | null
  size: string // bigint serialized as string
  uploadedBy: string | null
  createdAt: string
}

const FIFTY_MB = 50 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// TextAlign 커스텀 Extension (data-align 속성 기반)
const TextAlignClass = Extension.create({
  name: 'textAlignClass',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        textAlign: {
          default: null,
          parseHTML: (el) => el.getAttribute('data-align'),
          renderHTML: (attrs) => {
            if (!attrs.textAlign) return {}
            return { 'data-align': attrs.textAlign, class: `align-${attrs.textAlign}` }
          },
        },
      },
    }]
  },
  addCommands() {
    return {
      setTextAlign: (alignment: string) => ({ commands }: any) => {
        return ['paragraph', 'heading'].map((type) =>
          commands.updateAttributes(type, { textAlign: alignment })
        ).some(Boolean)
      },
      unsetTextAlign: () => ({ commands }: any) => {
        return ['paragraph', 'heading'].map((type) =>
          commands.resetAttributes(type, 'textAlign')
        ).some(Boolean)
      },
    } as any
  },
})

const lowlight = createLowlight(common)

const PRESENCE_COLORS = ['#958DF1', '#F98181', '#FBBC88', '#70CFF8', '#94FADB', '#B9F18D', '#F9A8D4']

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
type ConnStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export function DocumentEditorPage() {
  const { pageId } = useParams()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const currentUser = useAuthStore((s) => s.user)

  const [page, setPage] = useState<{ id: string; name: string; channelId: string | null; content: string | null } | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  // 백엔드 Page는 channelId를 사용하지만, MOCK_PROJECTS는 projectId 기반 — 현재 매핑이 없으므로 표시 보류
  const project = MOCK_PROJECTS.find((p) => p.id === page?.channelId) ?? null

  useEffect(() => {
    if (!pageId) {
      setPageLoading(false)
      setPageError('페이지 ID가 없습니다.')
      return
    }
    let cancelled = false
    setPageLoading(true)
    setPageError(null)
    api
      .get<PageData>(`/document/${pageId}`)
      .then((data) => {
        if (cancelled) return
        setPage({
          id: data.id,
          name: data.name ?? '제목 없음',
          channelId: data.channelId,
          content: data.content,
        })
      })
      .catch((err: Error) => {
        if (cancelled) return
        setPageError(err.message ?? '문서를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setPageLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pageId])

  // ── Hocuspocus 실시간 협업 설정 ──────────────────────────────
  const [connStatus, setConnStatus] = useState<ConnStatus>('connecting')
  const [isSynced, setIsSynced] = useState(false)
  const hasMigratedRef = useRef(false)

  // pageId 변경 시 sync/migration 상태 초기화
  useEffect(() => {
    setIsSynced(false)
    hasMigratedRef.current = false
  }, [pageId])

  // Y.Doc: pageId가 바뀌면 새로 생성
  const ydoc = useMemo(() => new Y.Doc(), [pageId])
  useEffect(() => () => { ydoc.destroy() }, [ydoc])

  // presence 표시용 로컬 사용자 정보 (awareness에 등록)
  const presenceUser = useMemo(() => {
    const name = currentUser?.name ?? 'Guest'
    const color = PRESENCE_COLORS[
      name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PRESENCE_COLORS.length
    ]
    return { name, color }
  }, [currentUser])

  // HocuspocusProvider: pageId가 바뀌면 새 연결 수립
  const provider = useMemo(() => {
    if (!pageId) return null
    const token = localStorage.getItem('accessToken') ?? ''
    const wsUrl = (import.meta.env.VITE_HOCUSPOCUS_URL as string | undefined) ?? 'ws://localhost:1234'

    return new HocuspocusProvider({
      url: wsUrl,
      name: pageId,        // documentName = pageId (UUID)
      document: ydoc,
      token,               // onAuthenticate에서 data.token으로 수신
      onConnect: () => setConnStatus('connected'),
      onDisconnect: () => setConnStatus('disconnected'),
      onAuthenticationFailed: () => setConnStatus('error'),
      onSynced: () => setIsSynced(true),
    })
  }, [pageId, ydoc])
  useEffect(() => () => { provider?.destroy() }, [provider])

  // 연결 상태 → 저장 상태 표시로 매핑
  const saveStatus: SaveStatus =
    connStatus === 'connected' ? 'saved' :
    connStatus === 'connecting' ? 'saving' :
    connStatus === 'error' ? 'error' : 'unsaved'

  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showTOC, setShowTOC] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)

  // 슬래시 커맨드 상태
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashRange, setSlashRange] = useState({ from: 0, to: 0 })
  const slashCallbackRef = useRef({
    onSlashCommand: (props: { query: string; range: { from: number; to: number } }) => {
      setSlashQuery(props.query)
      setSlashRange(props.range)
      setSlashMenuOpen(true)
    },
    onSlashDismiss: () => setSlashMenuOpen(false),
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        // TipTap v3 StarterKit은 History·Underline 내장 — 별도 추가 불필요
      }),
      TipTapTable.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TipTapImage.configure({ inline: false, allowBase64: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: '"/"를 입력하여 블록을 추가하세요...' }),
      TextAlignClass,
      CalloutBlock,
      ToggleBlock,
      SlashCommandExtension.configure({
        onSlashCommand: (props: { query: string; range: { from: number; to: number } }) =>
          slashCallbackRef.current.onSlashCommand(props),
        onSlashDismiss: () => slashCallbackRef.current.onSlashDismiss(),
      }),
      // Hocuspocus 실시간 협업: Y.Doc ↔ TipTap 바인딩
      // CollaborationCursor(v3.0.0)는 Collaboration(v3.22.1)과 버전 불일치로 비활성화
      Collaboration.configure({ document: ydoc }),
    ],
    editorProps: {
      attributes: {
        class:
          'prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-12 py-8',
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Hocuspocus onStoreDocument가 자동 저장 — REST API PUT 호출 불필요
      // 슬래시 커맨드 쿼리 업데이트만 처리
      if (slashMenuOpen && ed) {
        const { $from } = ed.state.selection
        const text = $from.parent.textContent.slice(0, $from.parentOffset)
        const slashMatch = text.match(/\/([^\s]*)$/)
        if (slashMatch) {
          setSlashQuery(slashMatch[1])
          setSlashRange({ from: $from.pos - slashMatch[0].length, to: $from.pos })
        } else {
          setSlashMenuOpen(false)
        }
      }
    },
  }, [ydoc, provider]) // pageId 변경 시 editor 재생성

  // 기존 HTML 문서 1회 마이그레이션:
  // Hocuspocus 동기화 완료 후 Y.Doc가 비어있고 pages.content가 HTML이면
  // TipTap에 주입 → Collaboration이 Y.Doc 업데이트 → onStoreDocument가 Yjs 형식으로 재저장
  useEffect(() => {
    if (!isSynced || !editor || !page || hasMigratedRef.current) return
    if (editor.isEmpty && page.content && page.content.trimStart().startsWith('<')) {
      hasMigratedRef.current = true
      editor.commands.setContent(page.content)
    }
  }, [isSynced, editor, page]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 첨부 파일 ──────────────────────────────────────────────
  const [attachments, setAttachments] = useState<AttachmentData[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 페이지 진입 시 첨부 목록 로드
  useEffect(() => {
    if (!pageId) return
    let cancelled = false
    setAttachmentsLoading(true)
    api
      .get<AttachmentData[]>(`/document/${pageId}/attachments`)
      .then((data) => {
        if (!cancelled) setAttachments(data)
      })
      .catch(() => {
        if (!cancelled) setAttachments([])
      })
      .finally(() => {
        if (!cancelled) setAttachmentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pageId])

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || !pageId) return

      if (file.size > FIFTY_MB) {
        addToast('error', `파일 크기는 50MB를 초과할 수 없습니다. (현재 ${formatFileSize(file.size)})`)
        return
      }

      setUploading(true)
      try {
        const token = localStorage.getItem('accessToken')
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`/api/document/${pageId}/attachments`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(currentUser ? { 'x-user-id': currentUser.id } : {}),
          },
          body: formData,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: '업로드 실패' }))
          throw new Error(err.message ?? '업로드 실패')
        }
        const created = (await res.json()) as AttachmentData
        setAttachments((prev) => [created, ...prev])
        addToast('success', `${file.name} 업로드 완료`)
      } catch (err) {
        addToast('error', (err as Error).message)
      } finally {
        setUploading(false)
      }
    },
    [pageId, currentUser, addToast],
  )

  const handleInsertTable = useCallback((rows: number, cols: number) => {
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  }, [editor])

  const handleInsertImage = useCallback(() => {
    setShowImageModal(true)
  }, [])

  const handleImageInsert = useCallback(
    (url: string, alt: string) => {
      editor?.chain().focus().setImage({ src: url, alt }).run()
    },
    [editor],
  )

  const handleAttachFile = useCallback(() => {
    if (!pageId) {
      addToast('warning', '페이지가 준비되지 않았습니다.')
      return
    }
    fileInputRef.current?.click()
  }, [pageId, addToast])

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      try {
        await api.delete(`/document/attachments/${attachmentId}`)
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
        addToast('success', '첨부를 삭제했습니다.')
      } catch (err) {
        addToast('error', (err as Error).message ?? '삭제 실패')
      }
    },
    [addToast],
  )

  // Hocuspocus가 자동 저장 처리 — 수동 저장 버튼은 안내 toast만 표시
  const handleManualSave = useCallback(() => {
    addToast('info', '변경 사항이 실시간으로 자동 저장됩니다.')
  }, [addToast])

  return (
    <div className="flex h-full flex-col">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-surface px-4 py-2 dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            title="뒤로 가기"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {pageLoading ? '불러오는 중…' : pageError ? '문서를 찾을 수 없습니다' : (page?.name ?? '새 문서')}
            </h1>
            {project && (
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{project.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 저장 / 연결 상태 */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-success">
                <Cloud size={14} />
                자동 저장 중
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-primary-500">
                <Loader size={14} className="animate-spin" />
                연결 중...
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1 text-warning">
                <CloudOff size={14} />
                오프라인
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-error">
                <CloudOff size={14} />
                인증 실패
              </span>
            )}
          </div>

          {/* 접속자 presence 아바타 */}
          <PresenceAvatars provider={provider} localUser={presenceUser} />

          <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* 저장 버튼 (자동 저장 안내) */}
          <button
            onClick={handleManualSave}
            className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            title="자동 저장 중 (Hocuspocus)"
          >
            <Save size={16} />
          </button>

          {/* 목차 */}
          <button
            onClick={() => {
              setShowTOC(!showTOC)
              if (!showTOC) setShowVersionHistory(false)
            }}
            className={`rounded p-1.5 transition-colors ${showTOC ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'}`}
            title="목차"
          >
            <ListTree size={16} />
          </button>

          {/* 버전 히스토리 */}
          <button
            onClick={() => {
              setShowVersionHistory(!showVersionHistory)
              if (!showVersionHistory) setShowTOC(false)
            }}
            className={`rounded p-1.5 transition-colors ${showVersionHistory ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'}`}
            title="버전 히스토리"
          >
            <History size={16} />
          </button>

          {/* 내보내기 */}
          <ExportMenu editor={editor} pageId={pageId ?? 'unknown'} />
        </div>
      </div>

      {/* 서식 툴바 */}
      <EditorToolbar
        editor={editor}
        onInsertTable={handleInsertTable}
        onInsertImage={handleInsertImage}
        onAttachFile={handleAttachFile}
      />

      {/* 표 편집 툴바 — 표 안에 커서가 있을 때만 표시 */}
      {editor && editor.isActive('table') && (
        <div className="flex items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-3 py-1 dark:border-neutral-700 dark:bg-neutral-800/50">
          <span className="mr-1 text-xs text-neutral-400">표 편집:</span>
          <TableToolbar editor={editor} />
        </div>
      )}

      {/* 메인 영역 (에디터 + 사이드 패널) */}
      <div className="flex flex-1 overflow-hidden">
        {/* 에디터 본문 */}
        <div className="relative flex-1 overflow-y-auto bg-surface dark:bg-surface-dark">
          {/* 라이브 커서 오버레이 (CollaborationCursor extension이 ProseMirror 내부에 직접 렌더링) */}
          <LiveCursors />

          {pageLoading && (
            <div className="flex h-full items-center justify-center">
              <Loader size={20} className="animate-spin text-primary-500" />
              <span className="ml-2 text-sm text-neutral-500">문서를 불러오는 중…</span>
            </div>
          )}

          {!pageLoading && pageError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <CloudOff size={32} className="text-neutral-400" />
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{pageError}</p>
              <button
                onClick={() => navigate(-1)}
                className="rounded bg-primary-500 px-4 py-1.5 text-xs text-white hover:bg-primary-600"
              >
                돌아가기
              </button>
            </div>
          )}

          {/* TipTap 에디터 — Hocuspocus 연결 후 Y.Doc 내용 자동 표시 */}
          {!pageLoading && !pageError && (
            <div className="mx-auto max-w-4xl">
              <EditorContent editor={editor} />
            </div>
          )}

          {/* 첨부 파일 영역 */}
          <div className="mx-auto max-w-4xl border-t border-neutral-100 px-12 py-4 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip size={14} className="text-neutral-400" />
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                첨부 파일
              </span>
              {uploading && (
                <span className="flex items-center gap-1 text-[11px] text-primary-500">
                  <Loader size={11} className="animate-spin" />
                  업로드 중…
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelected}
            />
            <div className="flex flex-wrap gap-2">
              {!attachmentsLoading && attachments.length === 0 && (
                <span className="text-xs text-neutral-400">첨부된 파일이 없습니다.</span>
              )}
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 hover:text-primary-600"
                  >
                    <DownloadIcon size={12} className="text-neutral-400" />
                    <span className="text-neutral-700 dark:text-neutral-200">{file.filename}</span>
                    <span className="text-neutral-400">{formatFileSize(Number(file.size))}</span>
                  </a>
                  <button
                    onClick={() => handleDeleteAttachment(file.id)}
                    className="rounded p-0.5 text-neutral-400 hover:text-error"
                    title="삭제"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 사이드 패널 */}
        <VersionHistoryPanel
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          pageId={pageId ?? 'unknown'}
          editor={editor}
        />
        <TOCPanel isOpen={showTOC} onClose={() => setShowTOC(false)} editor={editor} />
      </div>

      {/* 이미지 업로드 모달 */}
      <ImageUploadModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={handleImageInsert}
      />

      {/* 슬래시 커맨드 메뉴 */}
      {editor && (
        <SlashCommandMenu
          editor={editor}
          isOpen={slashMenuOpen}
          onClose={() => setSlashMenuOpen(false)}
          query={slashQuery}
          range={slashRange}
        />
      )}
    </div>
  )
}
