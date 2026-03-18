import { Extension } from '@tiptap/react'

export interface SlashCommandCallbackProps {
  query: string
  range: { from: number; to: number }
}

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      onSlashCommand: (_props: SlashCommandCallbackProps) => {},
      onSlashDismiss: () => {},
    }
  },

  addKeyboardShortcuts() {
    return {
      '/': ({ editor }) => {
        const { $from } = editor.state.selection
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
        if (textBefore === '') {
          setTimeout(() => {
            const pos = editor.state.selection.from
            this.options.onSlashCommand({
              query: '',
              range: { from: pos - 1, to: pos },
            })
          }, 10)
        }
        return false
      },
      Escape: () => {
        this.options.onSlashDismiss()
        return false
      },
    }
  },
})
