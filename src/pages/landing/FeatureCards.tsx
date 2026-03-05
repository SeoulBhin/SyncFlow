import { Users, Layers, Monitor } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { FEATURES } from '@/constants'

const iconMap = {
  Users,
  Layers,
  Monitor,
}

export function FeatureCards() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <h2 className="text-2xl font-bold text-neutral-900 sm:text-3xl dark:text-neutral-50">
          핵심 기능
        </h2>
        <p className="mt-3 text-neutral-500 dark:text-neutral-400">
          SyncFlow 하나로 팀 협업의 모든 것을 해결하세요
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = iconMap[feature.icon]
          return (
            <Card key={feature.title} hoverable className="flex flex-col items-start gap-4">
              <div className="rounded-lg bg-primary-50 p-3 dark:bg-primary-900/30">
                <Icon size={24} className="text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                {feature.description}
              </p>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
