import { Link } from 'react-router-dom'
import { Button } from '../../ui/Button.jsx'
import { HeroSection } from './HeroSection.jsx'
import { FeaturesSection } from './FeaturesSection.jsx'
import { ScrollyTelling } from './ScrollyTelling.jsx'

function CtaSection() {
  return (
    <section className="relative isolate overflow-hidden bg-swiss-neutral-900 px-6 py-24 shadow-2xl sm:px-24 xl:py-32">
      <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Prêt à équiper votre cabinet ?
      </h2>
      <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-8 text-gray-300">
        Rejoignez des centaines de professionnels de santé suisses qui font confiance à Medilec pour leur matériel.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Link to="/catalog">
          <Button size="lg" className="rounded-full px-8 text-base">Voir le catalogue</Button>
        </Link>
        <Link to="/contact" className="text-sm font-semibold leading-6 text-white hover:text-medilec-accent transition-colors">
          Contacter le support <span aria-hidden="true">→</span>
        </Link>
      </div>
      <svg
        viewBox="0 0 1024 1024"
        className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
        aria-hidden="true"
      >
        <circle cx={512} cy={512} r={512} fill="url(#gradient-cta)" fillOpacity="0.7" />
        <defs>
          <radialGradient id="gradient-cta">
            <stop stopColor="#D52B1E" />
            <stop offset={1} stopColor="#E93F33" />
          </radialGradient>
        </defs>
      </svg>
    </section>
  )
}

export function HomePage() {
  return (
    <div className="flex flex-col">
      {/* 1. Hero Section (Apple Style) */}
      <HeroSection />

      {/* 2. Features Grid */}
      <FeaturesSection />

      {/* 3. ScrollyTelling Experience */}
      <ScrollyTelling />

      {/* 4. Call To Action */}
      <CtaSection />
    </div>
  )
}
