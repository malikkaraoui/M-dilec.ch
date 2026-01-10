import { Link } from 'react-router-dom'
import { Button } from '../../ui/Button.jsx'

export function HeroSection() {
    return (
        <div className="relative isolate overflow-hidden bg-white">
            <div className="mx-auto max-w-7xl pb-24 pt-10 sm:pb-32 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:px-8 lg:py-40">
                <div className="px-6 lg:px-0 lg:pt-4">
                    <div className="mx-auto max-w-2xl">
                        <div className="max-w-lg">
                            <div className="mt-24 sm:mt-32 lg:mt-16">
                                <span className="rounded-full bg-medilec-accent/10 px-3 py-1 text-sm font-semibold leading-6 text-medilec-accent ring-1 ring-inset ring-medilec-accent/10">
                                    Nouveautés 2026
                                </span>
                            </div>
                            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl animate-fade-in-up">
                                Technologie Médicale de Pointe
                            </h1>
                            <p className="mt-6 text-lg leading-8 text-gray-600 animate-fade-in-up delay-100">
                                Équipez votre cabinet avec le meilleur matériel suisse. Fiabilité, précision et service premium pour les professionnels de santé exigeants.
                            </p>
                            <div className="mt-10 flex items-center gap-x-6 animate-fade-in-up delay-200">
                                <Link to="/catalog">
                                    <Button size="lg" className="rounded-full px-8">Explorer le catalogue</Button>
                                </Link>
                                <Link to="/contact" className="text-sm font-semibold leading-6 text-gray-900">
                                    Demander un devis <span aria-hidden="true">→</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:w-screen">
                    <div
                        className="absolute inset-y-0 right-1/2 -z-10 -mr-10 w-[200%] skew-x-[-30deg] bg-white shadow-xl shadow-medilec-accent/10 ring-1 ring-medilec-accent/50 md:-mr-20 lg:-mr-36"
                        aria-hidden="true"
                    />
                    <div className="shadow-lg md:rounded-3xl relative h-full w-full overflow-hidden bg-gray-50">
                        <img
                            src="/catalog/assets/products/defibrillateur-schiller-fred-easyport-plus.jpg"
                            alt="Hero Product"
                            className="h-full w-full object-cover object-center scale-105 hover:scale-100 transition-transform duration-[2000ms]"
                            onError={(e) => {
                                e.target.onerror = null;
                                // Fallback image if local asset missing
                                e.target.src = "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?q=80&w=2091&auto=format&fit=crop"
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                </div>
            </div>
        </div>
    )
}
