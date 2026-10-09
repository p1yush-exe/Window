import { useState } from 'react'
import { Button, ErrorBanner, Input, cx } from '@/components/ui'
import { DEMO_OTP, sendOtp, verifyOtp } from '@/lib/otp'
import { Check, ICON_SM } from '@/components/icons'

interface Props {
  label: string
  kind: 'phone' | 'email'
  value: string
  onChange: (v: string) => void
  verified: boolean
  onVerified: (v: boolean) => void
  validate: (v: string) => boolean
  placeholder?: string
}

/** Input + simulated OTP verification (code 0000). */
export function OtpField({ label, kind, value, onChange, verified, onVerified, validate, placeholder }: Props) {
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!validate(value)) {
      setError(kind === 'phone' ? 'Enter a valid 10-digit mobile number' : 'Enter a valid email address')
      return
    }
    setError(null)
    setBusy(true)
    await sendOtp(value)
    setBusy(false)
    setSent(true)
  }

  async function verify() {
    setBusy(true)
    const ok = await verifyOtp(value, code)
    setBusy(false)
    if (!ok) {
      setError(`Wrong code. For now the demo code is ${DEMO_OTP}.`)
      return
    }
    setError(null)
    onVerified(true)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label={label}
            name={kind}
            type={kind === 'phone' ? 'tel' : 'email'}
            inputMode={kind === 'phone' ? 'tel' : 'email'}
            autoComplete={kind === 'phone' ? 'tel' : 'email'}
            placeholder={placeholder}
            value={value}
            disabled={verified}
            onChange={(e) => {
              onChange(e.target.value)
              setSent(false)
              setCode('')
              onVerified(false)
            }}
          />
        </div>
        {verified ? (
          <span className="mb-2 inline-flex h-7 items-center gap-1 rounded bg-accent px-2.5 font-mono text-[11px] text-on-accent uppercase"><Check {...ICON_SM} size={12} /> Verified</span>
        ) : (
          <Button type="button" variant="secondary" size="md" onClick={() => void send()} loading={busy && !sent}>
            {sent ? 'Resend' : 'Send OTP'}
          </Button>
        )}
      </div>
      {sent && !verified && (
        <div className={cx('flex items-end gap-2 rounded-xl bg-surface p-2 ring-1 ring-line')}>
          <div className="flex-1">
            <Input
              label={`Code sent to ${value}`}
              name={`${kind}-otp`}
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              hint="Demo mode: enter 0000"
            />
          </div>
          <Button type="button" size="md" onClick={() => void verify()} disabled={code.length !== 4} loading={busy && sent}>
            Verify
          </Button>
        </div>
      )}
      <ErrorBanner message={error} />
    </div>
  )
}
