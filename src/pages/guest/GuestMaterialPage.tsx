import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Code2, Loader2 } from 'lucide-react'
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

// ── TipTap Prosemirror JSON 읽기 전용 렌더러 ─────────────────────────────────

type TipTapMark = { type: string; attrs?: Record<string, unknown> }

type TipTapNode = {
  type: string
  text?: string
  content?: TipTapNode[]
  attrs?: Record<string, unknown>
  marks?: TipTapMark[]
}

function applyMarks(text: string, marks: TipTapMark[] | undefined): React.ReactNode {
  if (!marks || marks.length === 0) return text
  let node: React.ReactNode = text
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        node = <strong>{node}</strong>
        break
      case 'italic':
        node = <em>{node}</em>
        break
      case 'strike':
        node = <s>{node}</s>
        break
      case 'underline':
        node = <u>{node}</u>
        break
      case 'code':
        node = (
          <code className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-[11px] text-violet-700 dark:bg-neutral-700 dark:text-violet-300">
            {node}
          </code>
        )
        break
    }
  }
  return node
}

function renderTipTapNode(node: TipTapNode, key: number): React.ReactNode {
  const children = node.content?.map((child, i) => renderTipTapNode(child, i)) ?? []

  switch (node.type) {
    case 'doc':
      return <div key={key}>{children}</div>

    case 'paragraph':
      return (
        <p key={key} className="mb-2 leading-relaxed text-neutral-700 dark:text-neutral-200">
          {children.length ? children : <br />}
        </p>
      )

    case 'text':
      return <span key={key}>{applyMarks(node.text ?? '', node.marks)}</span>

    case 'hardBreak':
      return <br key={key} />

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1
      const cls =
        level === 1
          ? 'mt-6 mb-3 text-2xl font-bold text-neutral-900 dark:text-neutral-50'
          : level === 2
            ? 'mt-5 mb-2 text-xl font-bold text-neutral-800 dark:text-neutral-100'
            : 'mt-4 mb-2 text-lg font-semibold text-neutral-800 dark:text-neutral-100'
      return (
        <div key={key} className={cls}>
          {children}
        </div>
      )
    }

    case 'bulletList':
      return (
        <ul key={key} className="mb-3 ml-5 list-disc space-y-1 text-neutral-700 dark:text-neutral-200">
          {children}
        </ul>
      )

    case 'orderedList':
      return (
        <ol key={key} className="mb-3 ml-5 list-decimal space-y-1 text-neutral-700 dark:text-neutral-200">
          {children}
        </ol>
      )

    case 'listItem':
      return <li key={key}>{children}</li>

    case 'blockquote':
      return (
        <blockquote
          key={key}
          className="mb-3 border-l-4 border-neutral-300 pl-4 italic text-neutral-500 dark:border-neutral-600 dark:text-neutral-400"
        >
          {children}
        </blockquote>
      )

    case 'codeBlock': {
      const lang = node.attrs?.language as string | undefined
      const code = node.content?.map((n) => n.text ?? '').join('') ?? ''
      return (
        <pre
          key={key}
          className="mb-4 overflow-x-auto rounded-lg bg-neutral-950 p-4 text-sm leading-relaxed text-neutral-200"
        >
          {lang && (
            <div className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">{lang}</div>
          )}
          <code className="font-mono">{code}</code>
        </pre>
      )
    }

    case 'horizontalRule':
      return <hr key={key} className="my-4 border-neutral-200 dark:border-neutral-700" />

    default:
      return children.length ? <div key={key}>{children}</div> : null
  }
}

function TipTapRenderer({ content }: { content: unknown }) {
  if (content === null || content === undefined) {
    return <p className="text-sm text-neutral-500">내용이 없습니다.</p>
  }
  if (typeof content !== 'object' || Array.isArray(content)) {
    return <p className="text-sm text-neutral-500">내용을 표시할 수 없습니다.</p>
  }

  const doc = content as TipTapNode
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) {
    return <p className="text-sm text-neutral-500">내용을 표시할 수 없습니다.</p>
  }

  const hasContent = doc.content.some(
    (n) =>
      n.type !== 'paragraph' ||
      (n.content && n.content.some((c) => c.text && c.text.trim().length > 0)),
  )
  if (!hasContent) {
    return <p className="text-sm text-neutral-500">내용이 없습니다.</p>
  }

  return <div className="text-sm">{doc.content.map((node, i) => renderTipTapNode(node, i))}</div>
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

// ── 라인 번호 ref (스크롤 복원용) ────────────────────────────────────────────

function useScrollToTop() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [])
  return ref
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
      .then((data) => { setPage(data); setState('done') })
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
          ) : (
            <TipTapRenderer content={page.content} />
          )}

          <p className="mt-10 border-t border-neutral-200 pt-5 text-center text-xs text-neutral-400 dark:border-neutral-700 dark:text-neutral-600">
            SyncFlow 게스트 읽기 전용 뷰 — 편집하려면 SyncFlow 계정으로 로그인하세요
          </p>
        </div>
      </main>
    </div>
  )
}
