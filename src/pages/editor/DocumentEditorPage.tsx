import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Table as TipTapTable } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Image as TipTapImage } from '@tiptap/extension-image'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Extension } from '@tiptap/core'

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
import { common, createLowlight } from 'lowlight'
import {
  ArrowLeft,
  Save,
  History,
  ListTree,
  Users,
  Cloud,
  CloudOff,
  Loader,
  Paperclip,
  Download as DownloadIcon,
  X,
} from 'lucide-react'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
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
import { MOCK_PAGES, MOCK_PROJECTS, MOCK_ATTACHMENTS } from '@/constants'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'

const lowlight = createLowlight(common)

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export function DocumentEditorPage() {
  const { pageId } = useParams()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const page = MOCK_PAGES.find((p) => p.id === pageId) ?? {
    id: pageId ?? 'unknown',
    name: '새 문서',
    type: 'doc' as const,
    projectId: 'p1',
  }
  const project = MOCK_PROJECTS.find((p) => p.id === page.projectId)

  const ydocRef = useRef(new Y.Doc())
  const providerRef = useRef(
    new HocuspocusProvider({
      url: 'ws://localhost:1234',
      name: pageId ?? 'unknown',
      token: 'dev-token',   // TODO: Part 2 완료 후 실제 JWT로 교체
      document: ydocRef.current,
    }),
  )

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showTOC, setShowTOC] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string; color: string }[]>([])

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
        history: false, // Collaboration이 히스토리를 대신 관리
      }),
      Underline,
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
      Collaboration.configure({ document: ydocRef.current }),
      CollaborationCursor.configure({
        provider: providerRef.current,
        user: {
          name: 'Dev User',   // TODO: Part 2 완료 후 실제 사용자 정보로 교체
          color: '#3B82F6',
        },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          'prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-12 py-8',
      },
    },
    onUpdate: ({ editor: ed }) => {
      setSaveStatus('unsaved')
      // 슬래시 커맨드 쿼리 업데이트
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
  })

  // Hocuspocus provider 이벤트 연결
  useEffect(() => {
    const provider = providerRef.current

    // 로컬 사용자 등록 (awareness)
    // TODO: Part 2 완료 후 실제 사용자 정보로 교체
    provider.awareness.setLocalStateField('user', {
      id: 'dev-user-1',
      name: 'Dev User',
      color: '#3B82F6',
    })

    // 접속자 목록 갱신
    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates()
      const users: { id: string; name: string; color: string }[] = []
      states.forEach((state, clientId) => {
        if (clientId !== provider.awareness.clientID && state.user) {
          users.push(state.user as { id: string; name: string; color: string })
        }
      })
      setOnlineUsers(users)
    }
    provider.awareness.on('change', handleAwarenessChange)

    // 연결 상태 → saveStatus 반영
    const handleStatus = ({ status }: { status: string }) => {
      if (status === 'disconnected') setSaveStatus('error')
      else if (status === 'connected') setSaveStatus((prev) => (prev === 'error' ? 'saved' : prev))
    }
    provider.on('status', handleStatus)

    return () => {
      provider.awareness.off('change', handleAwarenessChange)
      provider.off('status', handleStatus)
      provider.destroy()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 변경 감지 후 1.5초 디바운싱 → 저장 완료 표시
  // (실제 DB 저장은 Hocuspocus 서버 onStoreDocument에서 동일 간격으로 처리)
  useEffect(() => {
    if (saveStatus !== 'unsaved') return
    const timer = setTimeout(() => {
      setSaveStatus('saving')
      setTimeout(() => setSaveStatus('saved'), 800)
    }, 1500)
    return () => clearTimeout(timer)
  }, [saveStatus])

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
    addToast('info', '파일 첨부 기능은 백엔드 연동 후 사용 가능합니다. (목업)')
  }, [addToast])

  const handleManualSave = useCallback(() => {
    setSaveStatus('saving')
    setTimeout(() => {
      setSaveStatus('saved')
      addToast('success', '문서가 저장되었습니다.')
    }, 500)
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
              {page.name}
            </h1>
            {project && (
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{project.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 저장 상태 */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-success">
                <Cloud size={14} />
                저장 완료
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-primary-500">
                <Loader size={14} className="animate-spin" />
                저장 중...
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1 text-warning">
                <CloudOff size={14} />
                변경 사항 있음
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-error">
                <CloudOff size={14} />
                저장 실패
              </span>
            )}
          </div>

          {/* 온라인 사용자 */}
          <div className="flex items-center gap-1 ml-2">
            <Users size={14} className="text-neutral-400" />
            <div className="flex -space-x-1.5">
              {onlineUsers.map((u) => (
                <div
                  key={u.id}
                  className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white ring-2 ring-surface dark:ring-surface-dark-elevated"
                  style={{ backgroundColor: u.color }}
                  title={u.name}
                >
                  {u.name[0]}
                </div>
              ))}
            </div>
          </div>

          <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* 수동 저장 */}
          <button
            onClick={handleManualSave}
            className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            title="저장 (Ctrl+S)"
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
          {/* 라이브 커서 오버레이 */}
          <LiveCursors />

          {/* TipTap 에디터 */}
          <div className="mx-auto max-w-4xl">
            <EditorContent editor={editor} />
          </div>

          {/* 첨부 파일 영역 */}
          <div className="mx-auto max-w-4xl border-t border-neutral-100 px-12 py-4 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip size={14} className="text-neutral-400" />
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                첨부 파일
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MOCK_ATTACHMENTS.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <DownloadIcon size={12} className="text-neutral-400" />
                  <span className="text-neutral-700 dark:text-neutral-200">{file.name}</span>
                  <span className="text-neutral-400">{file.size}</span>
                  <button className="rounded p-0.5 text-neutral-400 hover:text-error">
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
