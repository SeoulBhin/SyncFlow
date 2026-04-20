import { cn } from '@/utils/cn'
import { MOCK_CHANNEL_MEMBERS } from '@/constants'
import type { CustomFieldDefinition } from '@/constants'

interface CustomFieldEditorProps {
  field: CustomFieldDefinition
  value: string | number | string[] | null
  onChange: (value: string | number | string[] | null) => void
}

export function CustomFieldEditor({ field, value, onChange }: CustomFieldEditorProps) {
  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={field.name}
          className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
        />
      )

    case 'number':
      return (
        <input
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder={field.name}
          className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
        />
      )

    case 'select':
      return (
        <div className="flex flex-wrap gap-1.5">
          {field.options?.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(value === opt.label ? null : opt.label)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                value === opt.label
                  ? `${opt.color} ring-2 ring-primary-400/50`
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-600',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )

    case 'date':
      return (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
        />
      )

    case 'person':
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
        >
          <option value="">선택 안 함</option>
          {MOCK_CHANNEL_MEMBERS.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      )

    case 'progress':
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={(value as number) ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-primary-500"
          />
          <span className="w-10 text-right text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {(value as number) ?? 0}%
          </span>
        </div>
      )

    default:
      return null
  }
}
