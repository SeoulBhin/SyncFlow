import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Code2, Loader2 } from 'lucide-react'
import * as Y from 'yjs'
import { yDocToProsemirrorJSON } from 'y-prosemirror'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table as TipTapTable } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Image as TipTapImage } from '@tiptap/extension-image'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { cn } from '@/utils/cn'

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface MaterialDetail {
  id: string
  title: string
  type: 'document' | 'code' | null
  language: string | null
  content: unknown
  updatedAt: string
}

// ── API ───────────────────────────────────────────────────────────────────────

async function guestFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error((data as { message?: string }).message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Yjs 디코더 ────────────────────────────────────────────────────────────────

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * DB에 저장된 content(base64 Yjs binary)를 렌더링 가능한 형태로 변환.
 * - 협업문서: Y.Doc 'default' XML fragment → TipTap/ProseMirror JSON
 * - 협업코드: Y.Doc getText(language) Y.Text → 코드 string
 */
function decodeYjsContent(
  raw: unknown,
  type: string | null,
  language: string | null,
): unknown {
  if (raw === null || raw === undefined) return null
  // 이미 객체(TipTap JSON 또는 legacy JSON) → 그대로 사용
  if (typeof raw === 'object') return raw

  if (typeof raw !== 'string' || raw.length === 0) return raw

  // base64 Yjs 디코드 시도
  try {
    const bytes = base64ToUint8Array(raw)
    const ydoc = new Y.Doc()
    Y.applyUpdate(ydoc, bytes)

    let decoded: unknown
    if (type === 'code') {
      const langKey = language ?? 'javascript'
      decoded = ydoc.getText(langKey).toString()
    } else {
      decoded = yDocToProsemirrorJSON(ydoc, 'default')
    }

    ydoc.destroy()
    return decoded
  } catch {
    // Yjs 디코드 실패
  }

  // JSON 문자열 시도 (legacy TipTap JSON)
  try {
    return JSON.parse(raw)
  } catch {
    // JSON 아님
  }

  // 그 외: 문자열 그대로 반환 (legacy HTML 또는 plain text)
  return raw
}

// ── 언어 레이블 ───────────────────────────────────────────────────────────────

const LANG_LABEL: Record<string, string> = {
  python: 'Python',
  javascript: 'JS',
  typescript: 'TS',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
}

// ── 읽기 전용 TipTap 문서 뷰어 ────────────────────────────────────────────────
// editable: false + EditorContent → app.css의 .tiptap 스타일 자동 적용
// (table/th/td/h1~h3/ul/ol/blockquote/pre 전부 기존 스타일 사용)

const lowlight = createLowlight(common)

type TipTapDocContent = Record<string, unknown>

function ReadOnlyDocumentViewer({ content }: { content: TipTapDocContent }) {
  const editor = useEditor(
    {
      editable: false,
      content: content,
      extensions: [
        // TipTap v3 StarterKit: Underline/History 내장
        StarterKit.configure({ codeBlock: false }),
        TipTapTable.configure({ resizable: false }),
        TableRow,
        TableCell,
        TableHeader,
        TipTapImage.configure({ inline: false, allowBase64: true }),
        CodeBlockLowlight.configure({ lowlight }),
      ],
      editorProps: {
        attributes: { class: 'focus:outline-none' },
      },
    },
    [],
  )

  if (!editor) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-neutral-400">
        <Loader2 size={16} className="animate-spin" />
        <span>문서 렌더링 중...</span>
      </div>
    )
  }

  return <EditorContent editor={editor} />
}

// ── 문자열 fallback 뷰어 (Yjs 디코드 실패 또는 legacy HTML/plain text) ─────────

function StringFallbackViewer({ content }: { content: string }) {
  if (!content) return <p className="text-sm text-neutral-500">내용이 없습니다.</p>

  // HTML 문자열: DOMParser로 텍스트 추출 (dangerouslySetInnerHTML XSS 방지)
  if (content.trimStart().startsWith('<')) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    const text = doc.body.textContent ?? ''
    return (
      <pre className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
        {text || '내용이 없습니다.'}
      </pre>
    )
  }

  return (
    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
      {content}
    </pre>
  )
}

// ── 코드 뷰어 ─────────────────────────────────────────────────────────────────

function extractCodeText(content: unknown): string {
  if (content === null || content === undefined) return ''
  if (typeof content === 'string') return content
  if (typeof content === 'object') {
    const obj = content as Record<string, unknown>
    if (typeof obj.code === 'string') return obj.code
    if (obj.type === 'doc' && Array.isArray(obj.content)) {
      const nodes = obj.content as Array<{ type?: string; content?: Array<{ text?: string }> }>
      const codeBlock = nodes.find((n) => n.type === 'codeBlock')
      if (codeBlock?.content) {
        return codeBlock.content.map((n) => n.text ?? '').join('')
      }
      return nodes.flatMap((n) => n.content ?? []).map((n) => n.text ?? '').join('\n')
    }
  }
  return ''
}

function CodeViewer({ content, language }: { content: unknown; language: string | null }) {
  const code = extractCodeText(content)
  if (!code) {
    return <p className="text-sm text-neutral-500">내용이 없습니다.</p>
  }
  return (
    <div className="overflow-hidden rounded-xl bg-neutral-950 shadow-lg">
      {language && (
        <div className="flex items-center gap-2 border-b border-neutral-800 px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {LANG_LABEL[language.toLowerCase()] ?? language}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto p-5 text-sm leading-relaxed text-neutral-200">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  )
}

// ── 스크롤 복원 ref ──────────────────────────────────────────────────────────

function useScrollToTop() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [])
  return ref
}

// ── 문서 content 렌더링 분기 헬퍼 ────────────────────────────────────────────

function isTipTapDoc(content: unknown): content is TipTapDocContent {
  return (
    content !== null &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    (content as { type?: string }).type === 'doc'
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function GuestMaterialPage() {
  const { token, pageId } = useParams<{ token: string; pageId: string }>()
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const [page, setPage] = useState<MaterialDetail | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const scrollRef = useScrollToTop()

  useEffect(() => {
    if (!token || !pageId) {
      setState('error')
      setErrorMsg('잘못된 링크입니다.')
      return
    }
    guestFetch<MaterialDetail>(`/api/guest/meetings/${token}/materials/${pageId}`)
      .then((data) => {
        console.log('[GuestMaterial Debug]', {
          pageId,
          type: data.type,
          contentType: typeof data.content,
          contentLength: typeof data.content === 'string' ? data.content.length : null,
          contentPreview:
            typeof data.content === 'string'
              ? data.content.slice(0, 80)
              : JSON.stringify(data.content)?.slice(0, 80),
        })

        const decodedContent = decodeYjsContent(data.content, data.type, data.language)
        setPage({ ...data, content: decodedContent })
        setState('done')
      })
      .catch((err: unknown) => {
        setState('error')
        setErrorMsg(err instanceof Error ? err.message : '자료를 불러올 수 없습니다.')
      })
  }, [token, pageId])

  const isCode = page?.type === 'code'

  // ── 로딩 ─────────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    )
  }

  // ── 에러 ─────────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-4 dark:bg-neutral-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <FileText size={26} className="text-red-500" />
        </div>
        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">{errorMsg}</p>
        <button
          onClick={() => window.close()}
          className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
        >
          창 닫기
        </button>
      </div>
    )
  }

  if (!page) return null

  // ── 뷰어 ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-700 dark:bg-neutral-800/95">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              isCode
                ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400'
                : 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400',
            )}
          >
            {isCode ? <Code2 size={16} /> : <FileText size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{page.title || '(제목 없음)'}</h1>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
              <span>{isCode ? '협업코드' : '협업문서'}</span>
              {page.language && (
                <>
                  <span>·</span>
                  <span>{LANG_LABEL[page.language.toLowerCase()] ?? page.language}</span>
                </>
              )}
              <span>·</span>
              <span>{new Date(page.updatedAt).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            읽기 전용
          </span>
        </div>
      </header>

      {/* 본문 */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {isCode ? (
            <CodeViewer content={page.content} language={page.language} />
          ) : isTipTapDoc(page.content) ? (
            <ReadOnlyDocumentViewer content={page.content} />
          ) : page.content === null || page.content === undefined ? (
            <p className="text-sm text-neutral-500">내용이 없습니다.</p>
          ) : (
            <StringFallbackViewer content={String(page.content)} />
          )}

          <p className="mt-10 border-t border-neutral-200 pt-5 text-center text-xs text-neutral-400 dark:border-neutral-700 dark:text-neutral-600">
            SyncFlow 게스트 읽기 전용 뷰 — 편집하려면 SyncFlow 계정으로 로그인하세요
          </p>
        </div>
      </main>
    </div>
  )
}
