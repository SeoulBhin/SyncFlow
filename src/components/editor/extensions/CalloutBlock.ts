import { Node, mergeAttributes } from '@tiptap/react'

export type CalloutType = 'info' | 'warning' | 'success' | 'error'

const CALLOUT_ICONS: Record<CalloutType, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌',
}

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    calloutBlock: {
      setCallout: (type?: CalloutType) => ReturnType
      toggleCallout: (type?: CalloutType) => ReturnType
    }
  }
}

export const CalloutBlock = Node.create({
  name: 'calloutBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-callout-type') ?? 'info',
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-callout-type': attributes.type }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const calloutType = node.attrs.type as CalloutType
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: `callout-block callout-${calloutType}`,
        'data-callout-type': calloutType,
      }),
      ['span', { class: 'callout-icon', contenteditable: 'false' }, CALLOUT_ICONS[calloutType]],
      ['div', { class: 'callout-content' }, 0],
    ]
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addCommands(): any {
    return {
      setCallout:
        (type: CalloutType = 'info') =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: any) => {
          return commands.wrapIn(this.name, { type })
        },
      toggleCallout:
        (type: CalloutType = 'info') =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: any) => {
          return commands.toggleWrap(this.name, { type })
        },
    }
  },
})
