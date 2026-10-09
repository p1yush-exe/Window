import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { AvailabilityBadge, Avatar, Button, ErrorBanner, FullPageSpinner, ProductImage, cx } from '@/components/ui'
import { useSession } from '@/features/auth/AuthProvider'
import { listenMatch, listenMessages, markMatchRead, sendMessage } from '@/lib/db'
import { formatClock } from '@/lib/format'
import { telemetry } from '@/lib/telemetry'
import type { Match, Message } from '@/lib/types'
import { ReviewPrompt } from '@/features/reviews/ReviewPrompt'
import { ChevronLeft, ICON } from '@/components/icons'

export function ChatPage() {
  const { matchId = '' } = useParams()
  const { profile } = useSession()
  const [match, setMatch] = useState<Match | null | undefined>(undefined)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const seen = useRef<Set<string>>(new Set())
  const mounted = useRef(0)

  useEffect(() => {
    mounted.current = Date.now()
    const u1 = listenMatch(matchId, setMatch, (e) => setError(e.message))
    const u2 = listenMessages(
      matchId,
      (msgs) => {
        // Delivery metric: messages from the other party that arrived after this screen opened.
        for (const m of msgs) {
          if (m.pending || seen.current.has(m.id)) continue
          seen.current.add(m.id)
          if (m.senderUid !== profile.uid && m.clientTs > mounted.current) {
            telemetry.record('message_delivery_ms', Date.now() - m.clientTs)
          }
        }
        setMessages(msgs)
      },
      (e) => setError(e.message),
    )
    return () => {
      u1()
      u2()
    }
  }, [matchId, profile.uid])

  useEffect(() => {
    if (match && (match.unread?.[profile.uid] ?? 0) > 0) void markMatchRead(match.id, profile.uid).catch(() => undefined)
  }, [match, profile.uid])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function onSend(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !match) return
    setText('')
    setSending(true)
    try {
      await sendMessage(match, profile.uid, body)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
      setText(body)
    } finally {
      setSending(false)
    }
  }

  if (match === undefined) return <FullPageSpinner />
  if (match === null)
    return (
      <div className="p-6">
        <ErrorBanner message="This chat does not exist or you do not have access to it." />
        <Link to="/bag" className="mt-4 inline-block text-sm text-spark-blue underline">Back to bag</Link>
      </div>
    )

  const isVendor = profile.uid === match.vendorId
  const other = isVendor ? match.buyerName : match.shopName || match.vendorName
  const otherLink = isVendor ? `/product/${match.productId}` : `/shop/${match.shopId}`
  const backLink = isVendor ? '/vendor/home' : '/bag'

  return (
    <div className="flex h-[calc(100dvh-var(--safe-top)-74px)] flex-col">
      <header className="flex items-center gap-3 border-b border-faded-gray bg-white px-3 py-2">
        <Link to={backLink} className="flex h-9 w-9 items-center justify-center rounded border-2 border-faded-gray text-charcoal hover:bg-[#f7f7f7]" aria-label="Back">
          <ChevronLeft {...ICON} />
        </Link>
        <Link to={otherLink} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={other} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{other}</p>
            <p className="truncate text-xs text-pencil-gray">{match.productTitle}</p>
          </div>
        </Link>
        <Link to={`/product/${match.productId}`} className="flex items-center gap-2">
          <AvailabilityBadge value={match.productAvailability ?? 'in_stock'} />
          <ProductImage src={match.productImage} alt={match.productTitle} className="h-10 w-10 rounded-lg" />
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <ErrorBanner message={error} />
        {messages.length === 0 && (
          <div className="mx-auto max-w-xs py-10 text-center text-sm text-pencil-gray">
            {isVendor ? `${match.buyerName} is interested in ${match.productTitle}. Say hello!` : `Ask ${match.vendorName} about price, sizes or availability.`}
          </div>
        )}
        {match.autoMessage && (
          <div className="mb-3 flex justify-start">
            <div className="max-w-[78%] border-2 border-faded-gray bg-[#f7f7f7] px-3.5 py-2 text-sm text-charcoal">
              <p className="mb-1 font-mono text-[10px] text-pencil-gray uppercase">Auto message from {match.shopName || match.vendorName}</p>
              <p className="whitespace-pre-wrap">{match.autoMessage}</p>
            </div>
          </div>
        )}
        <ul className="space-y-1.5">
          {messages.map((m, i) => {
            const mine = m.senderUid === profile.uid
            const prev = messages[i - 1]
            const grouped = prev && prev.senderUid === m.senderUid
            return (
              <li key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start', grouped ? '' : 'mt-3')}>
                <div
                  className={cx(
                    'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm',
                    mine ? 'rounded-br-md bg-eager-green text-white' : 'rounded-bl-md bg-white text-charcoal border-2 border-faded-gray',
                    m.pending && 'opacity-70',
                  )}
                >
                  <p className="break-words whitespace-pre-wrap">{m.body}</p>
                  <p className={cx('mt-0.5 text-right text-[10px]', mine ? 'text-white/75' : 'text-pencil-gray')}>
                    {m.pending ? 'sending…' : formatClock(m.createdAt)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
        <div ref={bottom} />
      </div>

      {!isVendor && messages.length >= 2 && <ReviewPrompt match={match} />}

      <form onSubmit={onSend} className="flex items-center gap-2 border-t border-faded-gray bg-white px-3 py-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message"
          maxLength={2000}
          className="h-11 flex-1 rounded border-2 border-faded-gray bg-[#f7f7f7] px-4 text-base outline-none focus:border-eager-green"
          autoComplete="off"
        />
        <Button type="submit" disabled={!text.trim() || sending} className="rounded px-5">
          Send
        </Button>
      </form>
    </div>
  )
}
