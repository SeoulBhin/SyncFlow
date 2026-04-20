import { HeroSection } from './HeroSection'
import { FeatureCards } from './FeatureCards'
import { CTASection } from './CTASection'
import { APP_NAME } from '@/constants'

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeatureCards />
      <CTASection />
      <footer className="border-t border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-neutral-700">
        &copy; {new Date().getFullYear()} {APP_NAME}. 계명대학교 컴퓨터공학과 &mdash; 2학년의 무게
      </footer>
    </>
  )
}
