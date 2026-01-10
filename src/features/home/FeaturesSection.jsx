import { Link } from 'react-router-dom'
import { Card } from '../../ui/Card.jsx'

export function FeaturesSection() {
    return (
        <section className="py-24 bg-white">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center mb-16">
                    <h2 className="text-base font-semibold leading-7 text-medilec-accent">Excellence Médicale</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-swiss-neutral-900 sm:text-4xl">
                        Tout votre équipement.<br />Un seul partenaire.
                    </p>
                    <p className="mt-6 text-lg leading-8 text-swiss-neutral-600">
                        Découvrez nos gammes spécialisées, conçues pour les professionnels de santé exigeants.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                    {/* Bento Item 1: Large */}
                    <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-swiss-neutral-100 group cursor-pointer transition-transform hover:scale-[1.01] duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-swiss-neutral-500/10 to-transparent z-10" />
                        <div className="absolute bottom-0 left-0 p-8 z-20">
                            <h3 className="text-2xl font-bold text-swiss-neutral-900">Monitoring Patient</h3>
                            <p className="mt-2 text-swiss-neutral-600">Surveillance continue et précise.</p>
                            <Link to="/catalog?c=monitoring" className="mt-4 inline-block text-sm font-semibold text-medilec-accent">Explorer &rarr;</Link>
                        </div>
                        <img
                            src="https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=2600&auto=format&fit=crop"
                            alt="Monitoring"
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 mix-blend-multiply"
                        />
                    </div>

                    {/* Bento Item 2: Tall */}
                    <div className="md:row-span-2 relative overflow-hidden rounded-3xl bg-swiss-neutral-900 text-white group cursor-pointer transition-transform hover:scale-[1.01] duration-500">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                        <div className="absolute bottom-0 left-0 p-8 z-20">
                            <h3 className="text-2xl font-bold">Défibrillation</h3>
                            <p className="mt-2 text-gray-300">Solutions d'urgence vitales.</p>
                            <Link to="/catalog?c=defibrillation" className="mt-4 inline-block text-sm font-semibold text-white">Voir la gamme &rarr;</Link>
                        </div>
                        <img
                            src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2000&auto=format&fit=crop"
                            alt="Defibrillation"
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60"
                        />
                    </div>

                    {/* Bento Item 3 */}
                    <div className="relative overflow-hidden rounded-3xl bg-blue-50 group cursor-pointer transition-transform hover:scale-[1.01] duration-500">
                        <div className="absolute bottom-0 left-0 p-8 z-20">
                            <h3 className="text-xl font-bold text-blue-900">Diagnostic</h3>
                            <Link to="/catalog?c=diagnostic" className="mt-2 inline-block text-sm font-semibold text-blue-700">Découvrir &rarr;</Link>
                        </div>
                        <img
                            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2000&auto=format&fit=crop"
                            alt="Diagnostic"
                            className="absolute right-0 top-0 w-1/2 h-full object-cover opacity-80 mix-blend-multiply"
                        />
                    </div>

                    {/* Bento Item 4 */}
                    <div className="relative overflow-hidden rounded-3xl bg-red-50 group cursor-pointer transition-transform hover:scale-[1.01] duration-500">
                        <div className="absolute bottom-0 left-0 p-8 z-20">
                            <h3 className="text-xl font-bold text-red-900">Consommables</h3>
                            <Link to="/catalog?c=consommables" className="mt-2 inline-block text-sm font-semibold text-red-700">Commander &rarr;</Link>
                        </div>
                        <div className="absolute right-[-20px] top-[-20px] bg-red-200/50 rounded-full h-32 w-32 blur-2xl" />
                    </div>

                </div>
            </div>
        </section>
    )
}
