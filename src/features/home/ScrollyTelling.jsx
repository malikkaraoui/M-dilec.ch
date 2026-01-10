import { useRef, useEffect, useState } from 'react'

const FEATURES = [
    {
        id: 1,
        title: "Précision Suisse",
        text: "Nous sélectionnons uniquement des équipements répondant aux normes les plus strictes. La qualité n'est pas une option, c'est notre engagement.",
        img: "https://images.unsplash.com/photo-1582719471384-9333ac4dc467?q=80&w=2600&auto=format&fit=crop"
    },
    {
        id: 2,
        title: "Logistique Simplifiée",
        text: "Commandez en quelques clics. Nous gérons le stock et l'expédition rapide vers toute la Suisse. Vos patients n'attendent pas.",
        img: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=2600&auto=format&fit=crop"
    },
    {
        id: 3,
        title: "Support Dédié",
        text: "Une équipe d'experts à votre écoute pour vous conseiller et assurer le service après-vente. Vous soignez, nous équipons.",
        img: "https://images.unsplash.com/photo-1576091160550-2187580018f7?q=80&w=2600&auto=format&fit=crop"
    }
]

export function ScrollyTelling() {
    const [activeFeature, setActiveFeature] = useState(FEATURES[0].id)
    const featuresRef = useRef([])

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = Number(entry.target.dataset.id)
                        setActiveFeature(id)
                    }
                })
            },
            {
                root: null,
                rootMargin: '-50% 0px -50% 0px', // Trigger when element is in the middle of viewport
                threshold: 0
            }
        )

        featuresRef.current.forEach((el) => {
            if (el) observer.observe(el)
        })

        return () => observer.disconnect()
    }, [])

    return (
        <section className="relative w-full bg-black text-white">
            {/* Sticky Background Area */}
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                {FEATURES.map((feature) => (
                    <div
                        key={feature.id}
                        className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${activeFeature === feature.id ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        <div className="absolute inset-0 bg-black/60 z-10" /> {/* Overlay for readability */}
                        <img
                            src={feature.img}
                            alt={feature.title}
                            className="h-full w-full object-cover"
                        />
                    </div>
                ))}
            </div>

            {/* Scrolling Text Content */}
            <div className="relative z-20 -mt-[100vh]">
                {FEATURES.map((feature, index) => (
                    <div
                        key={feature.id}
                        data-id={feature.id}
                        ref={(el) => (featuresRef.current[index] = el)}
                        className="flex h-screen items-center justify-center sm:justify-start px-6 sm:px-24"
                    >
                        <div className="max-w-xl transition-all duration-700 transform translate-y-0 opacity-100">
                            <h2 className={`text-4xl sm:text-6xl font-bold tracking-tighter mb-6 transition-colors duration-500 ${activeFeature === feature.id ? 'text-white' : 'text-neutral-500'}`}>
                                {feature.title}
                            </h2>
                            <p className={`text-xl sm:text-2xl leading-relaxed transition-colors duration-500 ${activeFeature === feature.id ? 'text-gray-200' : 'text-neutral-600'}`}>
                                {feature.text}
                            </p>
                        </div>
                    </div>
                ))}
                {/* Extra space at bottom to allow last item to scroll out if needed, or just end nicely */}
                <div className="h-[20vh]" />
            </div>
        </section>
    )
}
