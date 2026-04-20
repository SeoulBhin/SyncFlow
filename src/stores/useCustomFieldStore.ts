import { create } from 'zustand'
import type { CustomFieldDefinition, CustomFieldValue } from '@/constants'
import { MOCK_CUSTOM_FIELD_DEFINITIONS, MOCK_CUSTOM_FIELD_VALUES } from '@/constants'

interface CustomFieldState {
  fields: CustomFieldDefinition[]
  values: Record<string, CustomFieldValue[]>
  addField: (field: CustomFieldDefinition) => void
  removeField: (fieldId: string) => void
  updateField: (fieldId: string, updates: Partial<CustomFieldDefinition>) => void
  setFieldValue: (taskId: string, fieldId: string, value: string | number | string[] | null) => void
  getTaskFieldValues: (taskId: string) => CustomFieldValue[]
}

export const useCustomFieldStore = create<CustomFieldState>((set, get) => ({
  fields: MOCK_CUSTOM_FIELD_DEFINITIONS,
  values: MOCK_CUSTOM_FIELD_VALUES,

  addField: (field) =>
    set((s) => ({ fields: [...s.fields, field] })),

  removeField: (fieldId) =>
    set((s) => ({
      fields: s.fields.filter((f) => f.id !== fieldId),
    })),

  updateField: (fieldId, updates) =>
    set((s) => ({
      fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    })),

  setFieldValue: (taskId, fieldId, value) =>
    set((s) => {
      const taskValues = [...(s.values[taskId] ?? [])]
      const idx = taskValues.findIndex((v) => v.fieldId === fieldId)
      if (idx >= 0) {
        taskValues[idx] = { fieldId, value }
      } else {
        taskValues.push({ fieldId, value })
      }
      return { values: { ...s.values, [taskId]: taskValues } }
    }),

  getTaskFieldValues: (taskId) => get().values[taskId] ?? [],
}))
