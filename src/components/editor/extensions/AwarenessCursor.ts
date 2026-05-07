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

function createCursorWidget(user: { name: string; color: string }): HTMLElement {
  const wrapper = document.createElement('span')
  wrapper.setAttribute('data-awareness-cursor', 'true')
  wrapper.style.cssText = 'position:relative;display:inline-block;pointer-events:none;user-select:none;'

  const caret = document.createElement('span')
  caret.style.cssText = [
    'position:absolute',
    'top:0',
    'bottom:0',
    'left:-1px',
    'width:2px',
    `background:${user.color}`,
    'display:inline-block',
    'border-radius:1px',
  ].join(';')

  const label = document.createElement('span')
  label.textContent = user.name.slice(0, 16) // 이름이 너무 길면 잘라냄
  label.style.cssText = [
    'position:absolute',
    'bottom:100%',
    'left:-1px',
    'margin-bottom:1px',
    'font-size:11px',
    'font-weight:600',
    'line-height:1.4',
    'color:#fff',
    `background:${user.color}`,
    'padding:1px 5px',
    'border-radius:3px',
    'white-space:nowrap',
    'pointer-events:none',
    'user-select:none',
    'z-index:20',
  ].join(';')

  wrapper.appendChild(caret)
  wrapper.appendChild(label)
  return wrapper
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
            style: `background-color:${s.user!.color}28; border-radius:2px;`,
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

          const dispatchUpdate = () => {
            if (destroyed) return
            try {
              view.dispatch(view.state.tr.setMeta(awarenessCursorKey, 'update'))
            } catch { /* view가 이미 소멸된 경우 — ignore */ }
          }

          awareness.on('update', dispatchUpdate)

          return {
            update: (_view: EditorView, prevState: EditorState) => {
              if (destroyed) return
              // selection이 바뀌었을 때만 awareness에 커서 위치 전송
              if (!_view.state.selection.eq(prevState.selection)) {
                const { anchor, head } = _view.state.selection
                awareness.setLocalStateField('cursor', { anchor, head })
              }
            },
            destroy: () => {
              destroyed = true
              awareness.off('update', dispatchUpdate)
              // 내 커서를 awareness에서 제거
              try { awareness.setLocalStateField('cursor', null) } catch { /* ignore */ }
            },
          }
        },
      }),
    ]
  },
})
