import * as THREE from 'three'
import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Image, Text, Float } from '@react-three/drei'
import { easing } from 'maath'

function CarouselItem({ index, url, count, radius = 4 }) {
    const ref = useRef()
    const [hovered, hover] = useState(false)

    // Angle for this item based on index
    const angle = (index / count) * Math.PI * 2

    useFrame((state, delta) => {
        easing.damp3(ref.current.scale, hovered ? 1.2 : 1, 0.1, delta)
        easing.damp(ref.current.material, 'grayscale', hovered ? 0 : 1, 0.2, delta)
        easing.dampC(ref.current.material.color, hovered ? 'white' : '#aaa', 0.2, delta)
    })

    return (
        <group
            rotation={[0, -angle, 0]}
        >
            <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5}>
                <Image
                    ref={ref}
                    url={url || '/logo.png'} // Hard fallback just in case
                    transparent
                    side={THREE.DoubleSide}
                    onPointerOver={() => hover(true)}
                    onPointerOut={() => hover(false)}
                    scale={[1.4, 2, 1]}
                />
            </Float>
        </group>
    )
}

function Carousel({ images, radius = 5, speed = 0.2 }) {
    const group = useRef()
    const [isHovered, setIsHovered] = useState(false)

    useFrame((state, delta) => {
        // Auto rotation
        if (!isHovered) {
            group.current.rotation.y += delta * speed * 0.5
        } else {
            // Hover effect: dampen speed instead of full stop?
            // For now, pause is good for inspection
        }
    })

    return (
        <group
            ref={group}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
        >
            {images.map((img, i) => {
                const angle = (i / images.length) * Math.PI * 2
                return (
                    <group
                        key={i}
                        position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
                        rotation={[0, angle, 0]}
                    >
                        <CarouselItem index={i} url={img.url} count={images.length} />
                    </group>
                )
            })}
        </group>
    )
}

function Rig() {
    useFrame((state, delta) => {
        easing.damp3(state.camera.position, [state.pointer.x * 2, state.pointer.y * 1 + 2, 12], 0.3, delta)
        state.camera.lookAt(0, 0, 0)
    })
}

export const Home3DHero = ({ featuredProducts = [] }) => {
    const displayImages = useMemo(() => {
        let list = featuredProducts.length > 0 ? featuredProducts : [
            { url: '/logo.png' }, { url: '/logo.png' }, { url: '/logo.png' }
        ]

        // Ensure every item has a url, fallback to logo if missing or empty
        // This is the critical fix for the white screen
        list = list.map(item => ({ ...item, url: item.url || '/logo.png' }))

        // Ensure we have at least 8 items for a nice circle
        while (list.length < 8) {
            list = [...list, ...list]
        }
        return list.slice(0, 12)
    }, [featuredProducts])

    if (displayImages.length === 0) return null

    return (
        <div className="h-[500px] w-full bg-gradient-to-b from-swiss-neutral-50 to-white relative rounded-2xl overflow-hidden border border-swiss-neutral-200 shadow-inner">
            <div className="absolute top-6 left-8 z-10 pointer-events-none select-none">
                <h2 className="text-2xl font-bold text-medilec-accent uppercase tracking-widest drop-shadow-sm">Featured</h2>
                <p className="text-sm font-medium text-swiss-neutral-500">Discover our selection</p>
            </div>

            <Canvas camera={{ position: [0, 0, 12], fov: 35 }}>
                <fog attach="fog" args={['#fafafa', 10, 25]} />
                <ambientLight intensity={0.8} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                <pointLight position={[-10, -10, -10]} />

                <Carousel images={displayImages} radius={6} />
                <Rig />
            </Canvas>

            {/* Overlay gradient for fade effect on sides */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,transparent_60%,rgba(255,255,255,0.8)_100%)]" />
        </div>
    )
}
