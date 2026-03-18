import { Columns3, Plus, Lightbulb } from 'lucide-react'

interface EmptyBoardGuideProps {
  onAddTask: () => void
}

const TEMPLATES = [
  { label: '프로젝트 관리', description: 'To Do → In Progress → Done' },
  { label: '버그 트래킹', description: '신규 → 분석 중 → 수정 → 테스트 → 완료' },
  { label: '콘텐츠 제작', description: '아이디어 → 기획 → 제작 → 검수 → 배포' },
]

export function EmptyBoardGuide({ onAddTask }: EmptyBoardGuideProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20">
        <Columns3 size={32} className="text-primary-400" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-neutral-700 dark:text-neutral-200">
        칸반 보드를 시작하세요
      </h3>
      <p className="mb-6 max-w-sm text-center text-sm text-neutral-400">
        카드를 추가하고 드래그 앤 드롭으로 작업 상태를 관리하세요.
        상단 프리셋에서 워크플로우를 선택할 수도 있습니다.
      </p>

      <button
        onClick={onAddTask}
        className="mb-8 flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
      >
        <Plus size={16} />
        첫 번째 카드 추가
      </button>

      <div className="w-full max-w-md">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-neutral-400">
          <Lightbulb size={13} />
          추천 템플릿
        </div>
        <div className="space-y-2">
          {TEMPLATES.map((t) => (
            <div
              key={t.label}
              className="rounded-lg border border-neutral-200 px-4 py-3 transition-colors hover:border-primary-300 hover:bg-primary-50/50 dark:border-neutral-700 dark:hover:border-primary-600 dark:hover:bg-primary-900/10"
            >
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {t.label}
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">{t.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
