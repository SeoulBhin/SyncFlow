import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import {
  ArrowLeft,
  Play,
  Square,
  Save,
  Cloud,
  CloudOff,
  Loader,
  ExternalLink,
  X,
} from 'lucide-react'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { MonacoBinding } from 'y-monaco'
import { LanguageSelector, LANGUAGES } from '@/components/code-editor/LanguageSelector'
import type { LanguageOption } from '@/components/code-editor/LanguageSelector'
import { ConsolePanel } from '@/components/code-editor/ConsolePanel'
import type { ConsoleOutput } from '@/components/code-editor/ConsolePanel'
import { CodeLiveCursors } from '@/components/code-editor/CodeLiveCursors'
import { useMonacoRemoteCursors } from '@/components/code-editor/useMonacoRemoteCursors'
import { PresenceAvatars } from '@/components/editor/PresenceAvatars'
import { useToastStore } from '@/stores/useToastStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { MOCK_PAGES, MOCK_PROJECTS } from '@/constants'
import { apiFetch } from '@/lib/api'

const PRESENCE_COLORS = ['#958DF1', '#F98181', '#FBBC88', '#70CFF8', '#94FADB', '#B9F18D', '#F9A8D4']

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

const DEFAULT_CODE_SAMPLES: Record<string, string> = {
  python: `# Python 예제
print("Hello, SyncFlow!")

numbers = [1, 2, 3, 4, 5]
squares = [x ** 2 for x in numbers]
print(f"제곱: {squares}")
`,
  javascript: `// JavaScript 예제
console.log("Hello, SyncFlow!")

const numbers = [1, 2, 3, 4, 5]
const sum = numbers.reduce((a, b) => a + b, 0)
console.log("합계:", sum)
`,
  java: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, SyncFlow!");
  }
}
`,
  c: `#include <stdio.h>

int main() {
  printf("Hello, SyncFlow!\\n");
  return 0;
}
`,
  cpp: `#include <iostream>

int main() {
  std::cout << "Hello, SyncFlow!" << std::endl;
  return 0;
}
`,
  html: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>SyncFlow HTML</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #6366f1; }
  </style>
</head>
<body>
  <h1>Hello, SyncFlow!</h1>
  <p>HTML 미리보기가 아래에 표시됩니다.</p>
  <script>
    console.log("HTML 실행 완료")
  </script>
</body>
</html>
`,
  css: `/* CSS 예제 */
body {
  font-family: sans-serif;
  background: #f0f0f0;
}
`,
}

export function CodeEditorPage() {
  const { pageId } = useParams()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const { resolvedTheme } = useThemeStore()
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const cancelledRef = useRef(false)

  const page = MOCK_PAGES.find((p) => p.id === pageId) ?? {
    id: pageId ?? 'unknown',
    name: '새 코드',
    type: 'code' as const,
    projectId: 'p1',
  }
  const project = MOCK_PROJECTS.find((p) => p.id === page.projectId)

  const [language, setLanguage] = useState<LanguageOption>(LANGUAGES[0])
  const [codeMap, setCodeMap] = useState<Record<string, string>>(DEFAULT_CODE_SAMPLES)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [isRunning, setIsRunning] = useState(false)
  const [runTimer, setRunTimer] = useState(0)
  const [outputs, setOutputs] = useState<ConsoleOutput[]>([])
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)

  // presence + 실시간 공동 편집: HocuspocusProvider + Y.Doc
  const currentUser = useAuthStore((s) => s.user)
  const [presenceProvider, setPresenceProvider] = useState<HocuspocusProvider | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSynced, setIsSynced] = useState(false)
  const [monacoEditor, setMonacoEditor] = useState<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const [isStable, setIsStable] = useState(true)
  const lastEditAtRef = useRef<number>(0)
  const monacoBindingRef = useRef<InstanceType<typeof MonacoBinding> | null>(null)

  const presenceUser = useMemo(() => {
    const name = currentUser?.name ?? currentUser?.email ?? '익명 사용자'
    const color = PRESENCE_COLORS[
      name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PRESENCE_COLORS.length
    ]
    return { id: currentUser?.id, email: currentUser?.email, name, color }
  }, [currentUser])

  useEffect(() => {
    if (!pageId) return
    const ydoc = new Y.Doc()
    const token = localStorage.getItem('accessToken') ?? ''
    const wsUrl = (import.meta.env.VITE_HOCUSPOCUS_URL as string | undefined) ?? 'ws://localhost:3001'
    const p = new HocuspocusProvider({
      url: wsUrl,
      name: pageId,
      document: ydoc,
      token,
      onConnect: () => setIsConnected(true),
      onDisconnect: () => { setIsConnected(false); setIsSynced(false) },
      onSynced: () => setIsSynced(true),
    })
    setPresenceProvider(p)
    return () => {
      p.destroy()
      ydoc.destroy()
      setPresenceProvider(null)
      setIsConnected(false)
      setIsSynced(false)
    }
  }, [pageId])

  // awareness에 내 유저 정보 등록 (remote cursor label 포함)
  useEffect(() => {
    if (!presenceProvider) return
    presenceProvider.awareness.setLocalStateField('user', presenceUser)
  }, [presenceProvider, presenceUser])

  // Monaco ↔ Y.Text 바인딩: 편집기 마운트 + provider + 언어가 모두 준비되면 연결
  useEffect(() => {
    const doc = presenceProvider?.document
    if (!monacoEditor || !doc || !presenceProvider) return
    const ytext = doc.getText(language.id)
    const model = monacoEditor.getModel()
    if (!model) return
    const binding = new MonacoBinding(ytext, model, new Set([monacoEditor]), presenceProvider.awareness)
    monacoBindingRef.current = binding
    return () => {
      binding.destroy()
      monacoBindingRef.current = null
    }
  }, [monacoEditor, presenceProvider, language.id])

  // Y.Text 초기값 설정: 동기화 완료 후 문서가 비어있으면 기본 샘플 삽입
  useEffect(() => {
    const doc = presenceProvider?.document
    if (!isSynced || !doc) return
    const ytext = doc.getText(language.id)
    if (ytext.toString() === '') {
      doc.transact(() => {
        ytext.insert(0, DEFAULT_CODE_SAMPLES[language.id] ?? '')
      })
    }
  }, [isSynced, presenceProvider, language.id])

  // Monaco 커서/선택 → awareness 브로드캐스트
  useEffect(() => {
    if (!monacoEditor || !presenceProvider) return
    const d1 = monacoEditor.onDidChangeCursorPosition((e) => {
      presenceProvider.awareness.setLocalStateField('cursor', {
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })
    const d2 = monacoEditor.onDidChangeCursorSelection((e) => {
      const s = e.selection
      presenceProvider.awareness.setLocalStateField('monacoSel', {
        startLineNumber: s.startLineNumber,
        startColumn: s.startColumn,
        endLineNumber: s.endLineNumber,
        endColumn: s.endColumn,
      })
    })
    return () => { d1.dispose(); d2.dispose() }
  }, [monacoEditor, presenceProvider])

  // Monaco 본문 안 remote cursor 위젯 + selection 하이라이트
  useMonacoRemoteCursors(monacoEditor, presenceProvider)

  // 편집 안정화 감지: Y.Text 변경(로컬·원격 모두)마다 lastEditAt 갱신
  useEffect(() => {
    const doc = presenceProvider?.document
    if (!doc) return
    const ytext = doc.getText(language.id)
    const observer = () => { lastEditAtRef.current = Date.now() }
    ytext.observe(observer)
    return () => ytext.unobserve(observer)
  }, [presenceProvider, language.id])

  // 안정화 상태 폴링: 마지막 편집 후 1500ms 경과 → isStable
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastEditAtRef.current === 0) { setIsStable(true); return }
      setIsStable(Date.now() - lastEditAtRef.current >= 1500)
    }, 200)
    return () => clearInterval(interval)
  }, [])

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
    setMonacoEditor(editor)
  }, [])

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      setCodeMap((prev) => ({ ...prev, [language.id]: value ?? '' }))
      setSaveStatus('unsaved')
    },
    [language.id],
  )

  const handleRun = useCallback(async () => {
    if (isRunning || !isConnected || !isStable || !isSynced) return
    setIsRunning(true)
    setRunTimer(0)
    setIframeUrl(null)
    cancelledRef.current = false

    const currentCode = editorRef.current?.getValue() ?? codeMap[language.id] ?? ''
    const now = new Date()
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    try {
      const res = await apiFetch('/api/code/execute', {
        method: 'POST',
        body: JSON.stringify({ language: language.id, code: currentCode }),
      })

      if (cancelledRef.current) return

      const result: {
        output: string
        error: string | null
        executionTime: number
        iframeUrl: string | null
      } = await res.json()

      const newOutputs: ConsoleOutput[] = []

      if (result.iframeUrl) {
        setIframeUrl(result.iframeUrl)
        newOutputs.push({ type: 'stdout', text: 'HTML 미리보기가 아래에 표시됩니다.', timestamp: ts })
      }

      if (result.output) {
        const lines = result.output.split('\n')
        for (const line of lines) {
          if (line !== '') newOutputs.push({ type: 'stdout', text: line, timestamp: ts })
        }
      }

      if (result.error) {
        const lines = result.error.split('\n')
        for (const line of lines) {
          if (line !== '') newOutputs.push({ type: 'stderr', text: line, timestamp: ts })
        }
      }

      if (!result.output && !result.error && !result.iframeUrl) {
        newOutputs.push({ type: 'stdout', text: '(출력 없음)', timestamp: ts })
      }

      newOutputs.push({
        type: 'stdout',
        text: `\n프로세스 종료 — 실행 시간: ${result.executionTime}ms`,
        timestamp: ts,
      })

      setOutputs((prev) => [...prev, ...newOutputs])
    } catch (err: any) {
      if (cancelledRef.current) return
      setOutputs((prev) => [
        ...prev,
        {
          type: 'stderr',
          text: `서버 연결 실패: ${err.message ?? '알 수 없는 오류'}`,
          timestamp: ts,
        },
      ])
    } finally {
      if (!cancelledRef.current) setIsRunning(false)
    }
  }, [isRunning, isConnected, isStable, isSynced, language, codeMap])

  const handleStop = useCallback(() => {
    cancelledRef.current = true
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

  const handleLanguageChange = useCallback(
    (lang: LanguageOption) => {
      // 현재 코드 저장 후 언어 전환
      const currentCode = editorRef.current?.getValue()
      if (currentCode !== undefined) {
        setCodeMap((prev) => ({ ...prev, [language.id]: currentCode }))
      }
      setLanguage(lang)
      setSaveStatus('unsaved')
    },
    [language.id],
  )

  const canRun = !isRunning && isConnected && isStable && isSynced
  const runLabel = isRunning
    ? '실행 중...'
    : !isConnected
      ? '연결 대기 중...'
      : !isStable || !isSynced
        ? '편집 중...'
        : '실행'

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

          {/* 접속자 presence 아바타 */}
          <PresenceAvatars provider={presenceProvider} localUser={presenceUser} includeSelf={true} />

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
          <CodeLiveCursors provider={presenceProvider} />
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
              disabled={!canRun}
              title={canRun ? '코드 실행' : runLabel}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors ${
                canRun
                  ? 'bg-success hover:bg-green-600'
                  : 'cursor-not-allowed bg-neutral-400 dark:bg-neutral-600'
              }`}
            >
              <Play size={14} />
              {runLabel}
            </button>
          )}
        </div>
      </div>

      {/* 에디터 + 미리보기 + 콘솔 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            key={language.id}
            defaultValue={codeMap[language.id] ?? ''}
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

        {/* HTML 미리보기 */}
        {iframeUrl && (
          <div className="border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between bg-neutral-50 px-3 py-1.5 dark:bg-neutral-800">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                HTML 미리보기
              </span>
              <div className="flex items-center gap-1">
                <a
                  href={iframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                  title="새 탭에서 열기"
                >
                  <ExternalLink size={11} />
                  새 탭
                </a>
                <button
                  onClick={() => setIframeUrl(null)}
                  className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                  title="닫기"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            <iframe
              src={iframeUrl}
              className="w-full border-none bg-white"
              style={{ height: 280 }}
              sandbox="allow-scripts"
              title="HTML 미리보기"
            />
          </div>
        )}

        {/* 콘솔 패널 */}
        <ConsolePanel outputs={outputs} onClear={() => setOutputs([])} />
      </div>
    </div>
  )
}
