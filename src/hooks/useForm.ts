import { useState, useCallback, type ChangeEvent, type FormEvent } from 'react'

type Errors<T> = Partial<Record<keyof T, string>>

interface UseFormReturn<T> {
  values: T
  errors: Errors<T>
  touched: Partial<Record<keyof T, boolean>>
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void
  handleBlur: (e: ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (onValid: (values: T) => void | Promise<void>) => (e: FormEvent) => void
  isValid: boolean
}

export function useForm<T extends { [K in keyof T]: string }>(
  initialValues: T,
  validate: (values: T) => Errors<T>,
): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})

  const errors = validate(values)
  const isValid = Object.keys(errors).length === 0

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target
      setValues((prev) => ({ ...prev, [name]: value }))
      setTouched((prev) => ({ ...prev, [name]: true }))
    },
    [],
  )

  const handleBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name } = e.target
      setTouched((prev) => ({ ...prev, [name]: true }))
    },
    [],
  )

  const handleSubmit = useCallback(
    (onValid: (values: T) => void | Promise<void>) => (e: FormEvent) => {
      e.preventDefault()
      const allTouched = Object.keys(initialValues).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<keyof T, boolean>,
      )
      setTouched(allTouched)
      const currentErrors = validate(values)
      if (Object.keys(currentErrors).length === 0) {
        onValid(values)
      }
    },
    [initialValues, validate, values],
  )

  return { values, errors, touched, handleChange, handleBlur, handleSubmit, isValid }
}
