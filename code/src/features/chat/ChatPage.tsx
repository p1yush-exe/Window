import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { AvailabilityBadge, Avatar, Button, ErrorBanner, FullPageSpinner, ProductImage, cx } from '@/components/ui'
import { useSession } from '@/features/auth/AuthProvider'
import { listenMatch, listenMessages, markMatchRead, sendMessage } from '@/lib/db'
import { formatClock } from '@/lib/format'
import { telemetry } from '@/lib/telemetry'
import type { Match, Message } from '@/lib/types'
import { ReviewPrompt } from '@/features/reviews/ReviewPrompt'

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
        <Link to="/chats" className="mt-4 inline-block text-sm text-accent-text underline">Back to chats</Link>
      </div>
    )

  const isVendor = profile.uid === match.vendorId
  const other = isVendor ? match.buyerName : match.vendorName
  const otherLink = isVendor ? `/product/${match.productId}` : `/store/${match.vendorId}`

  return (
    <div className="flex h-[calc(100dvh-4.25rem-var(--safe-bottom)-var(--safe-top))] flex-col md:h-dvh">
      <header className="flex items-center gap-3 border-b border-line bg-canvas px-3 py-2">
        <Link to="/chats" className="flex h-9 w-9 items-center justify-center rounded text-xl hover:bg-surface" aria-label="Back">
          ←
        </Link>
        <Link to={otherLink} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={other} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{other}</p>
            <p className="truncate text-xs text-muted">{match.productTitle}</p>
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
          <div className="mx-auto max-w-xs py-10 text-center text-sm text-muted">
            {isVendor ? `${match.buyerName} is interested in ${match.productTitle}. Say hello!` : `Ask ${match.vendorName} about price, sizes or availability.`}
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
                    mine ? 'rounded-br-md bg-accent text-on-accent' : 'rounded-bl-md bg-canvas text-ink ring-1 ring-line',
                    m.pending && 'opacity-70',
                  )}
                >
                  <p className="break-words whitespace-pre-wrap">{m.body}</p>
                  <p className={cx('mt-0.5 text-right text-[10px]', mine ? 'text-bone-vellum/70' : 'text-muted')}>
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

      <form onSubmit={onSend} className="flex items-center gap-2 border-t border-line bg-canvas px-3 py-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message"
          maxLength={2000}
          className="h-11 flex-1 rounded border border-line bg-surface px-4 text-base outline-none focus:border-accent"
          autoComplete="off"
        />
        <Button type="submit" disabled={!text.trim() || sending} className="rounded px-5">
          Send
        </Button>
      </form>
    </div>
  )
}
