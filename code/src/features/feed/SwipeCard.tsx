import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { Link } from 'react-router'
import { AvailabilityBadge, ProductImage } from '@/components/ui'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/lib/types'

export type SwipeDirection = 'left' | 'right'

interface Props {
  product: Product
  isTop: boolean
  index: number
  onSwipe: (direction: SwipeDirection) => void
}

const THRESHOLD = 110
const VELOCITY = 600

export function SwipeCard({ product, isTop, index, onSwipe }: Props) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-250, 0, 250], [-14, 0, 14])
  const likeOpacity = useTransform(x, [20, 120], [0, 1])
  const nopeOpacity = useTransform(x, [-20, -120], [0, 1])

  function onDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info
    if (offset.x > THRESHOLD || velocity.x > VELOCITY) onSwipe('right')
    else if (offset.x < -THRESHOLD || velocity.x < -VELOCITY) onSwipe('left')
  }

  const scale = 1 - index * 0.04
  const y = index * 12

  return (
    <motion.div
      className="absolute inset-0 touch-none select-none"
      style={{ x, rotate, zIndex: 10 - index }}
      draggable={false}
      initial={{ scale, y, opacity: index > 2 ? 0 : 1 }}
      animate={{ scale, y, opacity: index > 2 ? 0 : 1 }}
      variants={{
        exit: (custom: SwipeDirection | undefined) => ({
          x: custom === 'left' ? -700 : 700,
          rotate: custom === 'left' ? -25 : 25,
          opacity: 0,
          transition: { duration: 0.35, ease: 'easeOut' },
        }),
      }}
      exit="exit"
      drag={isTop ? 'x' : false}
      dragElastic={0.9}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5">
        <ProductImage src={product.imageUrls[0]} alt={product.title} className="h-full w-full flex-1 bg-neutral-100" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-5 pt-24 text-white">
          <div className="mb-2 flex items-center gap-2">
            <AvailabilityBadge value={product.availability} />
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">{product.category}</span>
          </div>
          <h2 className="text-2xl leading-tight font-bold drop-shadow">{product.title}</h2>
          <p className="mt-0.5 text-sm text-white/80">
            {product.vendorName} · <span className="font-semibold text-white">{formatPrice(product.price, product.currency)}</span>
          </p>
          {product.description && <p className="mt-2 line-clamp-2 text-sm text-white/80">{product.description}</p>}
        </div>
        {isTop && (
          <Link
            to={`/product/${product.id}`}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow"
            aria-label="View details"
            onPointerDown={(e) => e.stopPropagation()}
          >
            i
          </Link>
        )}
        <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-6 -rotate-12 rounded-lg border-4 border-like px-3 py-1 text-3xl font-black text-like">
          LIKE
        </motion.div>
        <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-6 rotate-12 rounded-lg border-4 border-nope px-3 py-1 text-3xl font-black text-nope">
          NOPE
        </motion.div>
      </div>
    </motion.div>
  )
}
