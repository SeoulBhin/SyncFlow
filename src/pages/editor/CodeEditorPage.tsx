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
  ExternalLink,
  X,
} from 'lucide-react'
import { LanguageSelector, LANGUAGES } from '@/components/code-editor/LanguageSelector'
import type { LanguageOption } from '@/components/code-editor/LanguageSelector'
import { ConsolePanel } from '@/components/code-editor/ConsolePanel'
import type { ConsoleOutput } from '@/components/code-editor/ConsolePanel'
import { CodeLiveCursors } from '@/components/code-editor/CodeLiveCursors'
import { useToastStore } from '@/stores/useToastStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { MOCK_PAGES, MOCK_PROJECTS } from '@/constants'
import { apiFetch } from '@/lib/api'

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
  const [onlineUsers] = useState([
    { id: 'u2', name: '이테스터', color: 'bg-blue-500' },
    { id: 'u4', name: '최테스터', color: 'bg-green-500' },
  ])

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

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      setCodeMap((prev) => ({ ...prev, [language.id]: value ?? '' }))
      setSaveStatus('unsaved')
    },
    [language.id],
  )

  const handleRun = useCallback(async () => {
    if (isRunning) return
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
  }, [isRunning, language, codeMap])

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
