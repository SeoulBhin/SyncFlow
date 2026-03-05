import { cn } from '@/utils/cn'

interface SkeletonProps {
  width?: string
  height?: string
  className?: string
  rounded?: boolean
}

export function Skeleton({ width, height, className, rounded = false }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-neutral-200 dark:bg-neutral-700',
        rounded ? 'rounded-full' : 'rounded-lg',
        className,
      )}
      style={{ width, height }}
    />
  )
}
