import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import {
  ArrowLeft,
  Play,
  Square,
  Save,
  Users,
  Cloud,
  CloudOff,
  Loader,
} from 'lucide-react'
import { LanguageSelector, LANGUAGES } from '@/components/code-editor/LanguageSelector'
import type { LanguageOption } from '@/components/code-editor/LanguageSelector'
import { ConsolePanel } from '@/components/code-editor/ConsolePanel'
import type { ConsoleOutput } from '@/components/code-editor/ConsolePanel'
import { CodeLiveCursors } from '@/components/code-editor/CodeLiveCursors'
import { useToastStore } from '@/stores/useToastStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { MOCK_PAGES, MOCK_PROJECTS, MOCK_CODE_SAMPLES } from '@/constants'

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export function CodeEditorPage() {
  const { pageId } = useParams()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const { resolvedTheme } = useThemeStore()
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)

  const page = MOCK_PAGES.find((p) => p.id === pageId) ?? {
    id: pageId ?? 'unknown',
    name: '새 코드',
    type: 'code' as const,
    projectId: 'p1',
  }
  const project = MOCK_PROJECTS.find((p) => p.id === page.projectId)

  const [language, setLanguage] = useState<LanguageOption>(LANGUAGES[0])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [isRunning, setIsRunning] = useState(false)
  const [runTimer, setRunTimer] = useState(0)
  const [outputs, setOutputs] = useState<ConsoleOutput[]>([])
  const [onlineUsers] = useState([
    { id: 'u2', name: '이테스터', color: 'bg-blue-500' },
    { id: 'u4', name: '최테스터', color: 'bg-green-500' },
  ])

  const code = MOCK_CODE_SAMPLES[language.id] ?? MOCK_CODE_SAMPLES['python']

  // 자동 저장
  useEffect(() => {
    if (saveStatus !== 'unsaved') return
    const timer = setTimeout(() => {
      setSaveStatus('saving')
      setTimeout(() => setSaveStatus('saved'), 800)
    }, 1500)
    return () => clearTimeout(timer)
  }, [saveStatus])

  // 실행 타이머
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setRunTimer((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  const handleEditorMount = useCallback((editor: MonacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = editor
  }, [])

  const handleEditorChange = useCallback(() => {
    setSaveStatus('unsaved')
  }, [])

  const handleRun = useCallback(() => {
    if (isRunning) return
    setIsRunning(true)
    setRunTimer(0)

    const now = new Date()
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    // 실행 시뮬레이션 (백엔드 연동 전까지 목업)
    setTimeout(() => {
      const mockOutputs: ConsoleOutput[] = [
        { type: 'stderr', text: '[목업] 백엔드 연동 전이므로 샘플 출력을 표시합니다. 실제 코드 실행은 백엔드 연동 후 동작합니다.', timestamp: ts },
        { type: 'stdout', text: `[${language.label}] 코드 실행 시작...`, timestamp: ts },
      ]

      if (language.id === 'python') {
        mockOutputs.push(
          { type: 'stdout', text: 'Hello, SyncFlow!', timestamp: ts },
          { type: 'stdout', text: '결과: [1, 4, 9, 16, 25]', timestamp: ts },
        )
      } else if (language.id === 'javascript') {
        mockOutputs.push(
          { type: 'stdout', text: 'Hello, SyncFlow!', timestamp: ts },
          { type: 'stdout', text: 'Sum: 15', timestamp: ts },
        )
      } else if (language.id === 'java') {
        mockOutputs.push(
          { type: 'stdout', text: 'Hello, SyncFlow!', timestamp: ts },
        )
      } else if (language.id === 'c' || language.id === 'cpp') {
        mockOutputs.push(
          { type: 'stdout', text: 'Hello, SyncFlow!', timestamp: ts },
        )
      } else {
        mockOutputs.push(
          { type: 'stderr', text: `${language.label}은(는) 서버 사이드 실행을 지원하지 않습니다.`, timestamp: ts },
        )
      }

      mockOutputs.push(
        { type: 'stdout', text: `\n프로세스 종료 (코드: 0) — 실행 시간: ${((Math.random() * 0.5 + 0.1).toFixed(2))}s`, timestamp: ts },
      )

      setOutputs((prev) => [...prev, ...mockOutputs])
      setIsRunning(false)
    }, 1500)
  }, [isRunning, language])

  const handleStop = useCallback(() => {
    setIsRunning(false)
    const now = new Date()
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    setOutputs((prev) => [
      ...prev,
      { type: 'stderr', text: '실행이 사용자에 의해 중단되었습니다.', timestamp: ts },
    ])
  }, [])

  const handleManualSave = useCallback(() => {
    setSaveStatus('saving')
    setTimeout(() => {
      setSaveStatus('saved')
      addToast('success', '코드가 저장되었습니다.')
    }, 500)
  }, [addToast])

  const handleLanguageChange = useCallback((lang: LanguageOption) => {
    setLanguage(lang)
    setSaveStatus('unsaved')
  }, [])

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
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                {project.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 저장 상태 */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-success">
                <Cloud size={14} /> 저장 완료
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-primary-500">
                <Loader size={14} className="animate-spin" /> 저장 중...
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1 text-warning">
                <CloudOff size={14} /> 변경 사항 있음
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-error">
                <CloudOff size={14} /> 저장 실패
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
        </div>
      </div>

      {/* 툴바: 언어 선택 + 실행 */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-center gap-3">
          <LanguageSelector value={language.id} onChange={handleLanguageChange} />
          <CodeLiveCursors />
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              <Loader size={12} className="animate-spin" />
              {runTimer}s
            </span>
          )}
          {isRunning ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 rounded-lg bg-error px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              <Square size={14} />
              중지
            </button>
          ) : (
            <button
              onClick={handleRun}
              className="flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-600"
            >
              <Play size={14} />
              실행
            </button>
          )}
        </div>
      </div>

      {/* 에디터 + 콘솔 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Monaco Editor */}
        <div className="flex-1">
          <Editor
            defaultValue={code}
            language={language.monacoId}
            theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
            onMount={handleEditorMount}
            onChange={handleEditorChange}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: true },
              lineNumbers: 'on',
              wordWrap: 'on',
              tabSize: 2,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 12 },
              renderLineHighlight: 'all',
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
            }}
          />
        </div>

        {/* 콘솔 패널 */}
        <ConsolePanel outputs={outputs} onClear={() => setOutputs([])} />
      </div>
    </div>
  )
}
