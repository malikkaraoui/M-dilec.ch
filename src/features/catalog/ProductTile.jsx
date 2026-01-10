import { useNavigate } from 'react-router-dom'
import { assetUrl } from '../../lib/catalog'
import { useCart } from '../../hooks/useCart'
import { useState } from 'react'

export function ProductTile({ product, className = '' }) {
    const navigate = useNavigate()
    const cart = useCart()
    const [added, setAdded] = useState(false)

    const { id, slug, name, manufacturer_name: manufacturer, price_ht, cover_image } = product

    const priceDisplay = price_ht ? `${price_ht.toFixed(2)} CHF` : 'Sur demande'

    const cover = cover_image ? assetUrl(cover_image) : null
    const href = slug ? `/p/${slug}` : `/product/${id}`

    const handleAdd = (e) => {
        e.stopPropagation()
        cart.add({ id: String(id), name, brand: manufacturer, priceCents: price_ht * 100 })
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    return (
        <div
            className={`group relative overflow-hidden rounded-3xl bg-white border border-swiss-neutral-100 shadow-sm transition-all duration-500 hover:shadow-xl ${className}`}
            onClick={() => navigate(href)}
        >
            {/* Background Image / Cover */}
            <div className="absolute inset-0 z-0 bg-swiss-neutral-50">
                {cover ? (
                    <img
                        src={cover}
                        alt={name}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-swiss-neutral-300">
                        <span className="text-4xl font-bold opacity-20">Medilec</span>
                    </div>
                )}
                {/* Gradient Overlay - barely visible normally, stronger on hover to make text pop */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 text-white">
                <div className="transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
                    <p className="text-xs font-medium tracking-wider text-medilec-accent-weak uppercase mb-1 opacity-90">{manufacturer || 'Medical'}</p>
                    <h3 className={`font-bold leading-tight ${className.includes('col-span-2') ? 'text-2xl' : 'text-lg'}`}>
                        {name}
                    </h3>

                    <div className="mt-4 flex items-center justify-between opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="text-lg font-semibold">{priceDisplay}</span>
                        <button
                            onClick={handleAdd}
                            className={`
                   rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors
                   ${added ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-swiss-neutral-200'}
                 `}
                        >
                            {added ? 'Ajouté' : 'Ajouter'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
