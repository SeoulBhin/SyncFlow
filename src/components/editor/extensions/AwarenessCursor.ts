import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { HocuspocusProvider } from '@hocuspocus/provider'

// ────────────────────────────────────────────────────────────────────────────
//  타입
// ────────────────────────────────────────────────────────────────────────────

interface CursorPosition {
  anchor: number
  head: number
}

interface RemoteUserState {
  cursor?: CursorPosition
  user?: { name: string; color: string }
}

type AwarenessType = NonNullable<HocuspocusProvider['awareness']>

// ────────────────────────────────────────────────────────────────────────────
//  커서 DOM 생성
// ────────────────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function createCursorWidget(user: { name: string; color: string }): HTMLElement {
  // caret이 루트: 명시적 height + border-left로 세로 막대 보장
  const caret = document.createElement('span')
  caret.setAttribute('data-awareness-cursor', 'true')
  caret.style.cssText = [
    'position:relative',
    'display:inline-block',
    'width:0',
    `border-left:2px solid ${user.color}`,
    'height:1.2em',
    'vertical-align:text-bottom',
    'margin-left:-1px',
    'pointer-events:none',
    'user-select:none',
    'z-index:20',
  ].join(';')

  const label = document.createElement('span')
  label.textContent = user.name.slice(0, 20)
  label.style.cssText = [
    'position:absolute',
    'bottom:100%',
    'left:-1px',
    'margin-bottom:2px',
    `background:${user.color}`,
    'color:#fff',
    'font-size:11px',
    'font-weight:600',
    'line-height:1.4',
    'padding:2px 6px',
    'border-radius:4px',
    'white-space:nowrap',
    'pointer-events:none',
    'user-select:none',
    'z-index:21',
  ].join(';')

  caret.appendChild(label)
  return caret
}

// ────────────────────────────────────────────────────────────────────────────
//  DecorationSet 빌드
// ────────────────────────────────────────────────────────────────────────────

function buildDecorations(state: EditorState, awareness: AwarenessType): DecorationSet {
  const decorations: Decoration[] = []
  const myClientId = awareness.clientID
  const maxPos = state.doc.content.size

  if (maxPos === 0) return DecorationSet.empty

  awareness.getStates().forEach((raw, clientId) => {
    if (clientId === myClientId) return

    const s = raw as RemoteUserState
    if (!s.cursor || !s.user) return

    // 문서 크기 변화로 범위 벗어날 수 있으므로 반드시 클램핑
    const anchor = Math.max(0, Math.min(s.cursor.anchor, maxPos))
    const head   = Math.max(0, Math.min(s.cursor.head,   maxPos))

    try {
      // 커서 캐럿 위젯
      decorations.push(
        Decoration.widget(head, () => createCursorWidget(s.user!), {
          key: `aw-cursor-${clientId}`,
          side: 1,
        })
      )
    } catch { /* 위치 오류 — skip */ }

    // 셀렉션 하이라이트
    if (anchor !== head) {
      const from = Math.min(anchor, head)
      const to   = Math.max(anchor, head)
      try {
        decorations.push(
          Decoration.inline(from, to, {
            style: `background-color:${hexToRgba(s.user!.color, 0.25)};border-radius:2px;`,
            class: 'awareness-selection',
          })
        )
      } catch { /* 위치 오류 — skip */ }
    }
  })

  return DecorationSet.create(state.doc, decorations)
}

// ────────────────────────────────────────────────────────────────────────────
//  TipTap Extension
// ────────────────────────────────────────────────────────────────────────────

const awarenessCursorKey = new PluginKey<DecorationSet>('awarenessCursor')

export interface AwarenessCursorOptions {
  provider: HocuspocusProvider | null
}

export const AwarenessCursor = Extension.create<AwarenessCursorOptions>({
  name: 'awarenessCursor',

  // Collaboration priority=1000, default=100 → 50으로 ySyncPlugin 이후 초기화 보장
  priority: 50,

  addOptions() {
    return { provider: null }
  },

  addProseMirrorPlugins() {
    const awareness = this.options.provider?.awareness
    // provider나 awareness가 없으면 플러그인 자체를 추가하지 않음
    if (!awareness) return []

    return [
      new Plugin({
        key: awarenessCursorKey,

        state: {
          // ySyncPluginKey에 전혀 의존하지 않으므로 init 시 crash 없음
          init: (): DecorationSet => DecorationSet.empty,

          apply: (tr, old, _, newState): DecorationSet => {
            if (tr.getMeta(awarenessCursorKey) === 'update') {
              return buildDecorations(newState, awareness)
            }
            // 문서 변경이 있으면 decoration 위치 매핑, 없으면 그대로
            return tr.docChanged ? old.map(tr.mapping, tr.doc) : old
          },
        },

        props: {
          decorations: (state) => awarenessCursorKey.getState(state),
        },

        view: (view: EditorView) => {
          let destroyed = false
          let rafId: number | null = null

          // RAF 기반 throttle: awareness 업데이트 폭발 시에도 프레임당 1회만 dispatch
          const dispatchUpdate = () => {
            if (destroyed || rafId !== null) return
            rafId = requestAnimationFrame(() => {
              rafId = null
              if (destroyed) return
              try {
                view.dispatch(view.state.tr.setMeta(awarenessCursorKey, 'update'))
              } catch { /* view 소멸 — ignore */ }
            })
          }

          awareness.on('update', dispatchUpdate)

          // 마운트 즉시 내 커서 위치 브로드캐스트 (selection 이동 전에도 상대방에 표시)
          const { anchor: initAnchor, head: initHead } = view.state.selection
          awareness.setLocalStateField('cursor', { anchor: initAnchor, head: initHead })

          // ySyncPlugin 초기화 대기 후 이미 연결된 상대방 커서 즉시 렌더링
          requestAnimationFrame(() => { if (!destroyed) dispatchUpdate() })

          let prevAnchor = initAnchor
          let prevHead = initHead

          return {
            update: (_view: EditorView, _prevState: EditorState) => {
              if (destroyed) return
              const { anchor, head } = _view.state.selection
              // 같은 anchor/head면 awareness 업데이트 생략
              if (anchor === prevAnchor && head === prevHead) return
              prevAnchor = anchor
              prevHead = head
              awareness.setLocalStateField('cursor', { anchor, head })
            },
            destroy: () => {
              destroyed = true
              if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
              awareness.off('update', dispatchUpdate)
              try { awareness.setLocalStateField('cursor', null) } catch { /* ignore */ }
            },
          }
        },
      }),
    ]
  },
})
