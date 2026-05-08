import { useState, useRef } from 'react'
import { Image, Upload, X, Link } from 'lucide-react'
import { Button } from '@/components/common/Button'

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (url: string, alt: string) => void
}

export function ImageUploadModal({ isOpen, onClose, onInsert }: ImageUploadModalProps) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState('')
  const [alt, setAlt] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const resetAndClose = () => {
    setUrlInput('')
    setAlt('')
    setUploading(false)
    setProgress(0)
    setDragOver(false)
    setTab('upload')
    onClose()
  }

  const uploadFile = async (file: File) => {
    const altText = file.name.replace(/\.[^.]+$/, '')
    setAlt(altText)
    setUploading(true)
    setProgress(10)

    // 1. 실제 GCS 업로드 시도
    try {
      const token = localStorage.getItem('accessToken')
      const form = new FormData()
      form.append('file', file)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/document/upload')
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 90)) // 90%까지
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText) as { url: string }
            setProgress(100)
            onInsert(data.url, altText)
            resolve()
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Network error')))
        xhr.send(form)
      })

      resetAndClose()
      return
    } catch {
      // GCS 미설정 등으로 실패 시 base64 inline fallback
    }

    // 2. Fallback: base64로 에디터에 직접 삽입
    setProgress(60)
    const reader = new FileReader()
    reader.onload = (e) => {
      setProgress(100)
      onInsert(e.target?.result as string, altText)
      resetAndClose()
    }
    reader.onerror = () => {
      setUploading(false)
      setProgress(0)
    }
    reader.readAsDataURL(file)
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    void uploadFile(files[0])
  }

  const handleUrlInsert = () => {
    if (!urlInput.trim()) return
    onInsert(urlInput.trim(), alt || '이미지')
    resetAndClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetAndClose}>
      <div
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl dark:bg-surface-dark-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image size={18} className="text-primary-500" />
            <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">이미지 삽입</h2>
          </div>
          <button
            onClick={resetAndClose}
            className="rounded p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* 탭 */}
        <div className="mb-4 flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'upload'
                ? 'bg-surface text-neutral-800 shadow-sm dark:bg-neutral-700 dark:text-neutral-100'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            <Upload size={14} className="mr-1.5 inline" />
            파일 업로드
          </button>
          <button
            onClick={() => setTab('url')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'url'
                ? 'bg-surface text-neutral-800 shadow-sm dark:bg-neutral-700 dark:text-neutral-100'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            <Link size={14} className="mr-1.5 inline" />
            URL 입력
          </button>
        </div>

        {tab === 'upload' ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files) }}
              onClick={() => !uploading && fileRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-neutral-300 hover:border-primary-300 dark:border-neutral-600 dark:hover:border-primary-600'
              } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
            >
              <Upload size={32} className="mx-auto mb-2 text-neutral-400" />
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                클릭하거나 이미지를 드래그하세요
              </p>
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                PNG, JPG, GIF, WebP (최대 10MB)
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>

            {uploading && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-neutral-500">
                  <span>{progress < 100 ? '업로드 중...' : '완료'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                이미지 URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlInsert()}
                placeholder="https://example.com/image.png"
                className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                대체 텍스트
              </label>
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="이미지 설명"
                className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
              />
            </div>
            <Button onClick={handleUrlInsert} disabled={!urlInput.trim()} className="w-full">
              삽입
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
