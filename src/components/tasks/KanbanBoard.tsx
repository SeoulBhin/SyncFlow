import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Plus,
  GripVertical,
  Circle,
  Loader,
  CheckCircle,
  MoreHorizontal,
  Settings2,
  Pencil,
  Trash2,
  Video,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { MockTask, TaskPriority } from '@/constants'

/* ── 컬럼 타입 정의 ── */

interface KanbanColumn {
  id: string
  label: string
  color: string
  icon: typeof Circle
}

/* ── 프리셋 데이터 ── */

const COLUMN_PRESETS: Record<string, KanbanColumn[]> = {
  default: [
    { id: 'todo', label: '할 일', color: 'border-t-neutral-400', icon: Circle },
    { id: 'in-progress', label: '진행 중', color: 'border-t-primary-500', icon: Loader },
    { id: 'done', label: '완료', color: 'border-t-green-500', icon: CheckCircle },
  ],
  development: [
    { id: 'backlog', label: 'Backlog', color: 'border-t-neutral-300', icon: Circle },
    { id: 'todo', label: '할 일', color: 'border-t-neutral-400', icon: Circle },
    { id: 'dev', label: '개발', color: 'border-t-blue-500', icon: Loader },
    { id: 'review', label: '리뷰', color: 'border-t-orange-500', icon: Loader },
    { id: 'done', label: '완료', color: 'border-t-green-500', icon: CheckCircle },
  ],
  marketing: [
    { id: 'planning', label: '기획', color: 'border-t-purple-400', icon: Circle },
    { id: 'production', label: '제작', color: 'border-t-blue-500', icon: Loader },
    { id: 'review', label: '검수', color: 'border-t-orange-500', icon: Loader },
    { id: 'deploy', label: '배포', color: 'border-t-green-500', icon: CheckCircle },
  ],
}

/* ── 프리셋 라벨 ── */

const PRESET_LABELS: Record<string, string> = {
  default: '기본',
  development: '개발',
  marketing: '마케팅',
}

/* ── 컬럼 상단 보더 색상 팔레트 ── */

const COLOR_PALETTE = [
  { label: '회색', value: 'border-t-neutral-400' },
  { label: '기본', value: 'border-t-primary-500' },
  { label: '파랑', value: 'border-t-blue-500' },
  { label: '초록', value: 'border-t-green-500' },
  { label: '주황', value: 'border-t-orange-500' },
  { label: '보라', value: 'border-t-purple-400' },
  { label: '빨강', value: 'border-t-red-500' },
]

/* ── 색상 프리뷰용 매핑 ── */

const COLOR_PREVIEW: Record<string, string> = {
  'border-t-neutral-400': 'bg-neutral-400',
  'border-t-neutral-300': 'bg-neutral-300',
  'border-t-primary-500': 'bg-primary-500',
  'border-t-blue-500': 'bg-blue-500',
  'border-t-green-500': 'bg-green-500',
  'border-t-orange-500': 'bg-orange-500',
  'border-t-purple-400': 'bg-purple-400',
  'border-t-red-500': 'bg-red-500',
}

/* ── 우선순위 설정 ── */

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  urgent: { label: '긴급', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high: { label: '높음', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  normal: { label: '보통', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  low: { label: '낮음', color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400' },
}

/* ── 작업 상태를 컬럼에 매핑하는 유틸리티 ── */

function mapTaskToColumn(task: MockTask, columns: KanbanColumn[]): string {
  const colIds = columns.map((c) => c.id)

  // 정확히 일치하는 컬럼이 있으면 사용
  if (colIds.includes(task.status)) return task.status

  // 상태별 매핑 규칙
  const lastCol = columns[columns.length - 1]
  const firstCol = columns[0]

  if (task.status === 'done') {
    // 마지막 컬럼 또는 'done' id를 가진 컬럼
    return colIds.includes('done') ? 'done' : lastCol.id
  }

  if (task.status === 'in-progress') {
    // 중간 컬럼 또는 dev/production/review id를 가진 컬럼
    const progressMatches = ['dev', 'production', 'review', 'in-progress']
    const matched = colIds.find((id) => progressMatches.includes(id))
    if (matched) return matched
    // 중간 컬럼 선택
    const midIndex = Math.floor(columns.length / 2)
    return columns[midIndex].id
  }

  if (task.status === 'todo') {
    // 첫번째 비완료 컬럼 또는 'todo' id를 가진 컬럼
    if (colIds.includes('todo')) return 'todo'
    return firstCol.id
  }

  // 매칭되지 않으면 첫번째 컬럼
  return firstCol.id
}

/* ── Props ── */

interface KanbanBoardProps {
  tasks: MockTask[]
  onTaskClick: (task: MockTask) => void
  onStatusChange: (taskId: string, newStatus: string) => void
  onAddTask: () => void
}

export function KanbanBoard({ tasks, onTaskClick, onStatusChange, onAddTask }: KanbanBoardProps) {
  /* ── 상태 관리 ── */
  const [columns, setColumns] = useState<KanbanColumn[]>(COLUMN_PRESETS.default)
  const [activePreset, setActivePreset] = useState<string>('default')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  // 프리셋 드롭다운 열림/닫힘 상태
  const [presetOpen, setPresetOpen] = useState(false)
  const presetRef = useRef<HTMLDivElement>(null)

  // 컬럼 헤더 인라인 편집 상태
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // 컬럼 메뉴 상태
  const [menuColumnId, setMenuColumnId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // 색상 선택기 상태
  const [colorPickerColumnId, setColorPickerColumnId] = useState<string | null>(null)

  // 삭제 확인 상태
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  /* ── 외부 클릭 시 드롭다운/메뉴 닫기 ── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuColumnId(null)
        setColorPickerColumnId(null)
        setDeleteConfirmId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* ── 인라인 편집 시 input 포커스 ── */
  useEffect(() => {
    if (editingColumnId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingColumnId])

  /* ── 프리셋 변경 핸들러 ── */
  const handlePresetChange = useCallback((presetKey: string) => {
    const preset = COLUMN_PRESETS[presetKey]
    if (preset) {
      setColumns([...preset])
      setActivePreset(presetKey)
    }
    setPresetOpen(false)
  }, [])

  /* ── 컬럼 추가 핸들러 (최대 7개) ── */
  const handleAddColumn = useCallback(() => {
    if (columns.length >= 7) return
    const newId = `custom-${Date.now()}`
    setColumns((prev) => [
      ...prev,
      { id: newId, label: '새 컬럼', color: 'border-t-neutral-400', icon: Circle },
    ])
    setActivePreset('custom')
  }, [columns.length])

  /* ── 컬럼 이름 편집 시작 (더블클릭) ── */
  const handleStartEdit = useCallback((col: KanbanColumn) => {
    setEditingColumnId(col.id)
    setEditingLabel(col.label)
  }, [])

  /* ── 컬럼 이름 편집 완료 ── */
  const handleFinishEdit = useCallback(() => {
    if (editingColumnId && editingLabel.trim()) {
      setColumns((prev) =>
        prev.map((c) => (c.id === editingColumnId ? { ...c, label: editingLabel.trim() } : c)),
      )
      setActivePreset('custom')
    }
    setEditingColumnId(null)
    setEditingLabel('')
  }, [editingColumnId, editingLabel])

  /* ── 컬럼 삭제 핸들러 (최소 2개 유지) ── */
  const handleDeleteColumn = useCallback(
    (colId: string) => {
      if (columns.length <= 2) return
      setColumns((prev) => prev.filter((c) => c.id !== colId))
      setActivePreset('custom')
      setMenuColumnId(null)
      setDeleteConfirmId(null)
    },
    [columns.length],
  )

  /* ── 컬럼 색상 변경 핸들러 ── */
  const handleChangeColor = useCallback((colId: string, newColor: string) => {
    setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, color: newColor } : c)))
    setActivePreset('custom')
    setColorPickerColumnId(null)
    setMenuColumnId(null)
  }, [])

  /* ── 드래그 앤 드롭 핸들러 ── */
  const handleDragStart = (taskId: string) => {
    setDraggedId(taskId)
  }

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    setDragOverCol(colId)
  }

  const handleDrop = (colId: string) => {
    if (draggedId) {
      onStatusChange(draggedId, colId)
    }
    setDraggedId(null)
    setDragOverCol(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverCol(null)
  }

  /* ── 그리드 컬럼 수 계산 ── */
  const gridColsClass = (() => {
    switch (columns.length) {
      case 2: return 'md:grid-cols-2'
      case 3: return 'md:grid-cols-3'
      case 4: return 'md:grid-cols-4'
      case 5: return 'md:grid-cols-5'
      case 6: return 'md:grid-cols-6'
      case 7: return 'md:grid-cols-7'
      default: return 'md:grid-cols-3'
    }
  })()

  return (
    <div className="flex flex-col gap-4">
      {/* ── 상단 컨트롤 바: 프리셋 선택기 + 컬럼 추가 ── */}
      <div className="flex items-center justify-end gap-2">
        {/* 프리셋 선택 드롭다운 */}
        <div className="relative" ref={presetRef}>
          {/* 프리셋 선택 버튼 */}
          <button
            onClick={() => setPresetOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <Settings2 size={14} />
            {/* 현재 선택된 프리셋 라벨 표시 */}
            <span>{activePreset === 'custom' ? '사용자 정의' : PRESET_LABELS[activePreset]}</span>
          </button>

          {/* 프리셋 드롭다운 목록 */}
          {presetOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
              {Object.entries(PRESET_LABELS).map(([key, label]) => (
                /* 프리셋 항목 버튼 */
                <button
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  className={cn(
                    'w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700',
                    activePreset === key
                      ? 'font-semibold text-primary-600 dark:text-primary-400'
                      : 'text-neutral-600 dark:text-neutral-300',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 컬럼 추가 버튼 (최대 7개) */}
        <button
          onClick={handleAddColumn}
          disabled={columns.length >= 7}
          className={cn(
            'flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
            columns.length >= 7
              ? 'cursor-not-allowed border-neutral-100 text-neutral-300 dark:border-neutral-800 dark:text-neutral-600'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
          )}
          title={columns.length >= 7 ? '최대 7개까지 추가 가능합니다' : '새 컬럼 추가'}
        >
          <Plus size={14} />
          <span>컬럼</span>
        </button>
      </div>

      {/* ── 칸반 보드 그리드 ── */}
      <div className={cn('grid grid-cols-1 gap-4', gridColsClass)}>
        {columns.map((col) => {
          const Icon = col.icon
          // 작업을 현재 컬럼에 매핑하여 필터
          const columnTasks = tasks.filter((t) => mapTaskToColumn(t, columns) === col.id)

          return (
            <div
              key={col.id}
              className={cn(
                'rounded-xl border border-neutral-200 border-t-4 bg-neutral-50/50 p-3 transition-colors dark:border-neutral-700 dark:bg-neutral-800/30',
                col.color,
                dragOverCol === col.id && 'bg-primary-50/50 dark:bg-primary-900/10',
              )}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(col.id)}
            >
              {/* 컬럼 헤더 */}
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Icon size={15} className="text-neutral-500" />

                  {/* 컬럼 이름: 더블클릭으로 인라인 편집 */}
                  {editingColumnId === col.id ? (
                    /* 컬럼 이름 인라인 편집 입력 */
                    <input
                      ref={editInputRef}
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onBlur={handleFinishEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishEdit()
                        if (e.key === 'Escape') {
                          setEditingColumnId(null)
                          setEditingLabel('')
                        }
                      }}
                      className="w-20 rounded border border-primary-300 bg-white px-1 py-0.5 text-sm font-semibold text-neutral-700 outline-none dark:border-primary-600 dark:bg-neutral-800 dark:text-neutral-200"
                      maxLength={20}
                    />
                  ) : (
                    /* 컬럼 이름 (더블클릭으로 편집 시작) */
                    <span
                      className="cursor-default select-none text-sm font-semibold text-neutral-700 dark:text-neutral-200"
                      onDoubleClick={() => handleStartEdit(col)}
                      title="더블클릭으로 이름 편집"
                    >
                      {col.label}
                    </span>
                  )}

                  {/* 컬럼 내 작업 수 배지 */}
                  <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex items-center gap-0.5">
                  {/* 첫번째 컬럼에만 작업 추가 버튼 표시 */}
                  {col.id === columns[0].id && (
                    /* 작업 추가 버튼 */
                    <button
                      onClick={onAddTask}
                      className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
                      title="새 작업 추가"
                    >
                      <Plus size={15} />
                    </button>
                  )}

                  {/* 컬럼 설정 메뉴 버튼 */}
                  <div className="relative" ref={menuColumnId === col.id ? menuRef : undefined}>
                    {/* 컬럼 더보기 메뉴 버튼 */}
                    <button
                      onClick={() =>
                        setMenuColumnId((prev) => {
                          setColorPickerColumnId(null)
                          setDeleteConfirmId(null)
                          return prev === col.id ? null : col.id
                        })
                      }
                      className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
                      title="컬럼 설정"
                    >
                      <MoreHorizontal size={15} />
                    </button>

                    {/* 컬럼 설정 드롭다운 메뉴 */}
                    {menuColumnId === col.id && (
                      <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                        {/* 컬럼 이름 편집 버튼 */}
                        <button
                          onClick={() => {
                            handleStartEdit(col)
                            setMenuColumnId(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        >
                          <Pencil size={13} />
                          이름 편집
                        </button>

                        {/* 컬럼 색상 변경 버튼 */}
                        <button
                          onClick={() =>
                            setColorPickerColumnId((prev) => (prev === col.id ? null : col.id))
                          }
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        >
                          <div
                            className={cn(
                              'h-3 w-3 rounded-full',
                              COLOR_PREVIEW[col.color] || 'bg-neutral-400',
                            )}
                          />
                          색상 변경
                        </button>

                        {/* 색상 선택 팔레트 */}
                        {colorPickerColumnId === col.id && (
                          <div className="border-t border-neutral-100 px-3 py-2 dark:border-neutral-700">
                            <div className="flex flex-wrap gap-1.5">
                              {COLOR_PALETTE.map((cp) => (
                                /* 색상 선택 버튼 */
                                <button
                                  key={cp.value}
                                  onClick={() => handleChangeColor(col.id, cp.value)}
                                  className={cn(
                                    'h-5 w-5 rounded-full border-2 transition-transform hover:scale-110',
                                    COLOR_PREVIEW[cp.value] || 'bg-neutral-400',
                                    col.color === cp.value
                                      ? 'border-neutral-800 dark:border-white'
                                      : 'border-transparent',
                                  )}
                                  title={cp.label}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 컬럼 삭제 버튼 (최소 2개 이상일 때만 활성) */}
                        {columns.length > 2 && (
                          <>
                            <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
                            {deleteConfirmId === col.id ? (
                              <div className="px-3 py-1.5">
                                <p className="mb-1.5 text-[10px] text-red-500">
                                  이 컬럼을 삭제하시겠습니까?
                                </p>
                                <div className="flex gap-1">
                                  {/* 삭제 확인 버튼 */}
                                  <button
                                    onClick={() => handleDeleteColumn(col.id)}
                                    className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white transition-colors hover:bg-red-600"
                                  >
                                    삭제
                                  </button>
                                  {/* 삭제 취소 버튼 */}
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="rounded bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600 transition-colors hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300"
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* 컬럼 삭제 시작 버튼 */
                              <button
                                onClick={() => setDeleteConfirmId(col.id)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 size={13} />
                                컬럼 삭제
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 카드 목록 */}
              <div className="space-y-2">
                {columnTasks.map((task) => {
                  const p = priorityConfig[task.priority]
                  const isLastCol = col.id === columns[columns.length - 1].id

                  return (
                    /* 작업 카드 (드래그 가능) */
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onTaskClick(task)}
                      className={cn(
                        'cursor-pointer rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-all hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800',
                        draggedId === task.id && 'opacity-40',
                      )}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        {/* 작업 제목 */}
                        <p
                          className={cn(
                            'text-sm font-medium',
                            isLastCol
                              ? 'text-neutral-400 line-through dark:text-neutral-500'
                              : 'text-neutral-800 dark:text-neutral-100',
                          )}
                        >
                          {task.title}
                        </p>
                        {/* 드래그 핸들 아이콘 */}
                        <GripVertical
                          size={14}
                          className="mt-0.5 shrink-0 cursor-grab text-neutral-300 dark:text-neutral-600"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {/* 우선순위 배지 */}
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-medium',
                              p.color,
                            )}
                          >
                            {p.label}
                          </span>

                          {/* 회의에서 생성된 작업 배지 */}
                          {task.fromMeeting && (
                            <span className="flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              <Video size={9} />
                              회의
                            </span>
                          )}

                          {/* 마감일 표시 */}
                          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                            {task.dueDate.slice(5)}
                          </span>
                        </div>
                        {/* 담당자 아바타 */}
                        <div
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[9px] font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                          title={task.assigneeName}
                        >
                          {task.assigneeName[0]}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* 빈 컬럼 안내 */}
                {columnTasks.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed border-neutral-200 py-8 text-center text-xs text-neutral-400 dark:border-neutral-700">
                    카드를 여기로 드래그하세요
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
