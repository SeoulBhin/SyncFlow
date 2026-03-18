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
import { CalloutBlock } from '@/components/editor/extensions/CalloutBlock'
import { ToggleBlock } from '@/components/editor/extensions/ToggleBlock'
import { SlashCommandExtension } from '@/components/editor/extensions/SlashCommandExtension'
import { useToastStore } from '@/stores/useToastStore'
import { MOCK_PAGES, MOCK_PROJECTS, MOCK_DOC_CONTENT, MOCK_ATTACHMENTS } from '@/constants'

const lowlight = createLowlight(common)

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export function DocumentEditorPage() {
  const { pageId } = useParams()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const page = MOCK_PAGES.find((p) => p.id === pageId) ?? { id: pageId ?? 'unknown', name: '새 문서', type: 'doc' as const, projectId: 'p1' }
  const project = MOCK_PROJECTS.find((p) => p.id === page.projectId)

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showTOC, setShowTOC] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [onlineUsers] = useState([
    { id: 'u2', name: '이테스터', color: 'bg-blue-500' },
    { id: 'u4', name: '최테스터', color: 'bg-green-500' },
  ])

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
      }),
      Underline,
      TipTapTable.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TipTapImage.configure({ inline: false, allowBase64: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: '"/"를 입력하여 블록을 추가하세요...' }),
      CalloutBlock,
      ToggleBlock,
      SlashCommandExtension.configure({
        onSlashCommand: (props: { query: string; range: { from: number; to: number } }) =>
          slashCallbackRef.current.onSlashCommand(props),
        onSlashDismiss: () => slashCallbackRef.current.onSlashDismiss(),
      }),
    ],
    content: MOCK_DOC_CONTENT,
    editorProps: {
      attributes: {
        class: 'prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-12 py-8',
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

  // 자동 저장 시뮬레이션
  useEffect(() => {
    if (saveStatus !== 'unsaved') return
    const timer = setTimeout(() => {
      setSaveStatus('saving')
      setTimeout(() => setSaveStatus('saved'), 800)
    }, 1500)
    return () => clearTimeout(timer)
  }, [saveStatus])

  const handleInsertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  const handleInsertImage = useCallback(() => {
    setShowImageModal(true)
  }, [])

  const handleImageInsert = useCallback((url: string, alt: string) => {
    editor?.chain().focus().setImage({ src: url, alt }).run()
  }, [editor])

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
            <h1 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{page.name}</h1>
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
                  className={`h-6 w-6 rounded-full ${u.color} flex items-center justify-center text-[10px] font-medium text-white ring-2 ring-surface dark:ring-surface-dark-elevated`}
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
            onClick={() => { setShowTOC(!showTOC); if (!showTOC) setShowVersionHistory(false) }}
            className={`rounded p-1.5 transition-colors ${showTOC ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'}`}
            title="목차"
          >
            <ListTree size={16} />
          </button>

          {/* 버전 히스토리 */}
          <button
            onClick={() => { setShowVersionHistory(!showVersionHistory); if (!showVersionHistory) setShowTOC(false) }}
            className={`rounded p-1.5 transition-colors ${showVersionHistory ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'}`}
            title="버전 히스토리"
          >
            <History size={16} />
          </button>

          {/* 내보내기 */}
          <ExportMenu />
        </div>
      </div>

      {/* 서식 툴바 */}
      <EditorToolbar
        editor={editor}
        onInsertTable={handleInsertTable}
        onInsertImage={handleInsertImage}
        onAttachFile={handleAttachFile}
      />

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
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">첨부 파일</span>
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
        <VersionHistoryPanel isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} />
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
