export {
  Heart, ShoppingBag, User, Store, Plus, ArrowLeftRight, Camera, Image, ImagePlus, MapPin, Search, X, Check,
  ChevronLeft, ChevronRight, Bell, MessageCircle, Settings, Tag, Coins, Download, Sun, Moon, Star, Crop, Sparkles, LogOut,
  Pencil, Trash2, Send, Lock, Map, Package, Inbox, Ticket, Gem, Zap, Shield, Globe, Phone, Mail, Info, RefreshCw,
  SlidersHorizontal, Smartphone, CircleAlert, ThumbsDown, BadgeCheck,
} from 'lucide-react'

/** Shared sizing: 20px stroke icons in the mono UI voice. */
export const ICON = { size: 20, strokeWidth: 1.75, absoluteStrokeWidth: true } as const
export const ICON_SM = { size: 16, strokeWidth: 1.75, absoluteStrokeWidth: true } as const
export const ICON_LG = { size: 28, strokeWidth: 1.75, absoluteStrokeWidth: true } as const

import type { SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
  strokeWidth?: number
  absoluteStrokeWidth?: boolean
}

/** Heart with a plus in its centre: the super-swipe mark. Same props as a Lucide icon. */
export function HeartPlus({ size = 24, strokeWidth = 2, absoluteStrokeWidth, fill = 'none', className, ...rest }: IconProps) {
  const sw = absoluteStrokeWidth ? (strokeWidth * 24) / size : strokeWidth
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...rest}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 8v6M9 11h6" stroke={fill !== 'none' ? '#fff' : 'currentColor'} />
    </svg>
  )
}
