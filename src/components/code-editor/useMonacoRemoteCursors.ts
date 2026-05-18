import { useEffect, useRef } from 'react'
import type { editor as MonacoEditorNS } from 'monaco-editor'
import type { HocuspocusProvider } from '@hocuspocus/provider'

interface RemoteCursorState {
  user?: { name: string; color: string }
  cursor?: { line: number; column: number }
  monacoSel?: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return `rgba(136,136,136,${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function makeCursorDom(name: string, color: string): HTMLElement {
  const wrap = document.createElement('span')
  wrap.style.cssText =
    'position:relative;width:0;overflow:visible;pointer-events:none;user-select:none;'

  const bar = document.createElement('span')
  bar.style.cssText = `position:absolute;top:0;left:-1px;width:2px;height:1.35em;background:${color};`

  const lbl = document.createElement('span')
  lbl.textContent = name.length > 16 ? name.slice(0, 15) + '…' : name
  lbl.style.cssText = [
    'position:absolute',
    'bottom:calc(100% + 1px)',
    'left:0',
    `background:${color}`,
    'color:#fff',
    'font-size:10px',
    'font-weight:600',
    'line-height:1.4',
    'padding:1px 5px',
    'border-radius:3px',
    'white-space:nowrap',
    'pointer-events:none',
    'user-select:none',
  ].join(';')

  wrap.appendChild(bar)
  wrap.appendChild(lbl)
  return wrap
}

type WidgetEntry = {
  widget: MonacoEditorNS.IContentWidget
  pos: { line: number; col: number }
}

export function useMonacoRemoteCursors(
  editor: MonacoEditorNS.IStandaloneCodeEditor | null,
  provider: HocuspocusProvider | null,
) {
  const decoCollRef = useRef<MonacoEditorNS.IEditorDecorationsCollection | null>(null)
  const widgetMapRef = useRef(new Map<number, WidgetEntry>())
  const styleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    if (!editor || !provider) return

    const awareness = provider.awareness
    decoCollRef.current = editor.createDecorationsCollection([])

    const style = document.createElement('style')
    style.setAttribute('data-rmc', 'true')
    document.head.appendChild(style)
    styleRef.current = style

    const update = () => {
      const myId = awareness.clientID
      const activeIds = new Set<number>()
      const decos: MonacoEditorNS.IModelDeltaDecoration[] = []
      const cssRules: string[] = []

      awareness.getStates().forEach((rawState, clientId) => {
        if (clientId === myId) return
        const state = rawState as RemoteCursorState
        if (!state.user) return

        activeIds.add(clientId)
        const { name, color } = state.user
        const selCls = `rmc-sel-${clientId}`

        // ── Selection highlight ──
        const sel = state.monacoSel
        if (
          sel &&
          (sel.startLineNumber !== sel.endLineNumber || sel.startColumn !== sel.endColumn)
        ) {
          cssRules.push(`.${selCls}{background:${hexToRgba(color, 0.25)}!important;}`)
          decos.push({
            range: {
              startLineNumber: sel.startLineNumber,
              startColumn: sel.startColumn,
              endLineNumber: sel.endLineNumber,
              endColumn: sel.endColumn,
            },
            options: { inlineClassName: selCls },
          })
        }

        // ── Cursor content widget ──
        const cur = state.cursor
        if (cur) {
          const entry = widgetMapRef.current.get(clientId)
          if (entry) {
            // Reuse existing widget — update mutable pos, then request layout
            if (entry.pos.line !== cur.line || entry.pos.col !== cur.column) {
              entry.pos.line = cur.line
              entry.pos.col = cur.column
              editor.layoutContentWidget(entry.widget)
            }
          } else {
            // Create new widget; pos is shared so getPosition() always reads current value
            const pos = { line: cur.line, col: cur.column }
            const dom = makeCursorDom(name, color)
            const widget: MonacoEditorNS.IContentWidget = {
              allowEditorOverflow: true,
              suppressMouseDown: true,
              getId: () => `rmc-${clientId}`,
              getDomNode: () => dom,
              getPosition: () => ({
                position: { lineNumber: pos.line, column: pos.col },
                preference: [0 as MonacoEditorNS.ContentWidgetPositionPreference],
              }),
            }
            editor.addContentWidget(widget)
            widgetMapRef.current.set(clientId, { widget, pos })
          }
        }
      })

      // Remove widgets for users who left
      widgetMapRef.current.forEach((entry, id) => {
        if (!activeIds.has(id)) {
          editor.removeContentWidget(entry.widget)
          widgetMapRef.current.delete(id)
        }
      })

      style.textContent = cssRules.join('\n')
      decoCollRef.current?.set(decos)
    }

    awareness.on('update', update)
    update()

    return () => {
      awareness.off('update', update)
      widgetMapRef.current.forEach((entry) => editor.removeContentWidget(entry.widget))
      widgetMapRef.current.clear()
      decoCollRef.current?.clear()
      decoCollRef.current = null
      style.remove()
      styleRef.current = null
    }
  }, [editor, provider])
}
