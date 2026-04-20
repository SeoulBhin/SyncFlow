import { Node, mergeAttributes } from '@tiptap/react'

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggleBlock: () => ReturnType
      toggleToggleBlock: () => ReturnType
    }
  }
}

export const ToggleBlock = Node.create({
  name: 'toggleBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      open: {
        default: false,
        parseHTML: (element: HTMLElement) => element.classList.contains('is-open'),
        renderHTML: (attributes: Record<string, unknown>) => (attributes.open ? { class: 'is-open' } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div.toggle-block' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const isOpen = node.attrs.open
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: `toggle-block${isOpen ? ' is-open' : ''}`,
      }),
      [
        'div',
        {
          class: 'toggle-header',
          contenteditable: 'false',
          onclick: 'this.parentElement.classList.toggle("is-open")',
        },
        ['span', { class: 'toggle-chevron' }, '▶'],
        ['span', {}, '토글 블록'],
      ],
      ['div', { class: 'toggle-content' }, 0],
    ]
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addCommands(): any {
    return {
      setToggleBlock:
        () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: any) => {
          return commands.wrapIn(this.name, { open: true })
        },
      toggleToggleBlock:
        () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: any) => {
          return commands.toggleWrap(this.name)
        },
    }
  },
})
