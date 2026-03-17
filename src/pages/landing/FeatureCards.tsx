import { Card } from '@/components/common/Card'
import { FEATURES } from '@/constants'

export function FeatureCards() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <h2 className="text-2xl font-bold text-neutral-900 sm:text-3xl dark:text-neutral-50">
          핵심 기능
        </h2>
        <p className="mt-3 text-neutral-500 dark:text-neutral-400">
          SyncFlow 하나로 회의부터 협업까지 모든 것을 해결하세요
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <Card key={feature.title} hoverable className="flex flex-col items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-lg font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              {i + 1}
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              {feature.title}
            </h3>
            <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              {feature.description}
            </p>
          </Card>
        ))}
      </div>
    </section>
  )
}
