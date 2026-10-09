import { useState } from 'react'
import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { Link } from 'react-router'
import { ProductImage, cx } from '@/components/ui'
import { HeartPlus, ICON_SM, Store, Tag } from '@/components/icons'
import { formatPrice } from '@/lib/format'
import { formatDistance } from '@/lib/geo'
import type { RankedProduct } from './rank'

export type SwipeDirection = 'left' | 'right'

interface Props {
  product: RankedProduct
  isTop: boolean
  index: number
  onSwipe: (direction: SwipeDirection) => void
  /** Reports horizontal drag progress (-1..1) so the page can draw the side overlays. */
  onDrag?: (progress: number) => void
  frame?: 'none' | 'lime' | 'bone' | 'double' | 'dashed'
  badge?: string | null
}

const THRESHOLD = 110
const VELOCITY = 600

export function priceRange(p: { priceMin: number | null; priceMax: number | null; price: number | null; currency: string }) {
  if (p.priceMin !== null && p.priceMax !== null && p.priceMax !== p.priceMin) return `${formatPrice(p.priceMin, p.currency)} – ${formatPrice(p.priceMax, p.currency)}`
  const v = p.priceMin ?? p.price
  return formatPrice(v, p.currency)
}

export function SwipeCard({ product, isTop, index, onSwipe, onDrag, frame = 'none', badge }: Props) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-250, 0, 250], [-10, 0, 10])
  const [back, setBack] = useState(false)
  const [moved, setMoved] = useState(false)

  function onDragEnd(_: unknown, info: PanInfo) {
    onDrag?.(0)
    const { offset, velocity } = info
    if (offset.x > THRESHOLD || velocity.x > VELOCITY) onSwipe('right')
    else if (offset.x < -THRESHOLD || velocity.x < -VELOCITY) onSwipe('left')
    setTimeout(() => setMoved(false), 50)
  }

  const scale = 1 - index * 0.04
  const y = index * 12
  const frameCls: Record<string, string> = {
    none: 'border-2 border-charcoal rounded-2xl',
    lime: 'border-[3px] border-eager-green rounded-2xl',
    bone: 'border-4 border-charcoal rounded-2xl',
    double: 'border-4 border-double border-charcoal rounded-2xl',
    dashed: 'border-[3px] border-dashed border-charcoal rounded-2xl',
  }

  return (
    <motion.div
      className="absolute inset-0 touch-none select-none"
      style={{ x, rotate, zIndex: 10 - index }}
      initial={{ scale, y, opacity: index > 2 ? 0 : 1 }}
      animate={{ scale, y, opacity: index > 2 ? 0 : 1 }}
      variants={{
        exit: (custom: SwipeDirection | undefined) => ({
          x: custom === 'left' ? -700 : 700,
          rotate: custom === 'left' ? -20 : 20,
          opacity: 0,
          transition: { duration: 0.35, ease: 'easeOut' },
        }),
      }}
      exit="exit"
      drag={isTop && !back ? 'x' : false}
      dragElastic={0.9}
      dragConstraints={{ left: 0, right: 0 }}
      onDragStart={() => setMoved(true)}
      onDrag={(_, info) => onDrag?.(Math.max(-1, Math.min(1, info.offset.x / 160)))}
      onDragEnd={onDragEnd}
      draggable={false}
    >
      <div
        className={cx('flip h-full w-full', back && 'is-back')}
        onClick={() => {
          if (isTop && !moved) setBack((b) => !b)
        }}
      >
        <div className="flip-inner relative h-full w-full">
          {/* Front: image with outline, name, short description */}
          <div className={cx('flip-face absolute inset-0 flex flex-col bg-white p-3', frameCls[frame] ?? frameCls.none)}>
            <div className="relative flex-1 overflow-hidden rounded-xl border-2 border-charcoal bg-[#f7f7f7]">
              <ProductImage src={product.imageUrls[0]} alt={product.title} className="h-full w-full" />
              {badge && <span className="absolute top-2 left-2 rounded bg-eager-green px-[7px] py-[3px] font-mono text-[11px] tracking-[0.053em] text-white uppercase">{badge}</span>}
              {product.superOnly && (
                <span className="absolute top-2 right-2 flex items-center gap-1 rounded bg-white/90 px-[7px] py-[3px] font-mono text-[11px] tracking-[0.053em] text-charcoal uppercase">
                  <HeartPlus {...ICON_SM} size={12} /> Super only
                </span>
              )}
            </div>
            <div className="pt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="truncate text-[22px] leading-tight  text-charcoal">{product.title}</h2>
                {Number.isFinite(product.distanceKm) && <span className="shrink-0 font-mono text-[11px] text-pencil-gray uppercase">{formatDistance(product.distanceKm)}</span>}
              </div>
              <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-pencil-gray">{product.description || product.shopName}</p>
              <p className="mt-2 font-mono text-[10px] tracking-[0.053em] text-pencil-gray uppercase">Tap to flip · drag to swipe</p>
            </div>
          </div>

          {/* Back: cost, full description, swipe cost */}
          <div className={cx('flip-face flip-back absolute inset-0 flex flex-col bg-white p-4', frameCls[frame] ?? frameCls.none)}>
            <p className="label">{product.productCode || 'Product'}</p>
            <h2 className="mt-1 text-[24px] leading-tight  text-charcoal">{product.title}</h2>
            <p className="mt-3 font-mono text-[18px] text-charcoal">{priceRange(product)}</p>
            <p className="font-mono text-[11px] text-pencil-gray uppercase">{product.paymentModes?.length ? product.paymentModes.join(' · ') : 'ask the seller'}</p>
            <p className="mt-3 flex-1 overflow-y-auto text-[15px] leading-relaxed text-charcoal">{product.description || 'No description yet.'}</p>
            {product.tags?.length > 0 && (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {product.tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded border-2 border-faded-gray px-[7px] py-[3px] font-mono text-[11px] text-charcoal uppercase"><Tag {...ICON_SM} size={11} />{t}</span>
                ))}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-faded-gray pt-3">
              <Link to={`/shop/${product.shopId}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 font-mono text-[12px] text-spark-blue uppercase underline">
                <Store {...ICON_SM} /> {product.shopName || product.vendorName}
              </Link>
              <span className={cx('rounded px-[7px] py-[3px] font-mono text-[11px] tracking-[0.053em] uppercase', product.superOnly ? 'bg-eager-green text-white' : 'border-2 border-faded-gray text-charcoal')}>
                {product.superOnly ? 'Super swipe only' : 'Costs 1 swipe'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
