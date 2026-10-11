import { env } from './env'

export interface RazorpayPrefill {
  name?: string
  email?: string
  contact?: string
}

export interface RazorpayCheckoutOptions {
  amount: number // in INR (Rupees)
  name?: string
  description?: string
  prefill?: RazorpayPrefill
  onSuccess: (paymentId: string) => void | Promise<void>
  onDismiss?: () => void
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_signature?: string
}

let scriptPromise: Promise<void> | null = null

/**
 * Dynamically loads the official Razorpay Checkout SDK script.
 */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window context is unavailable.'))
  }
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
    return Promise.resolve()
  }
  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Razorpay script failed to load.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load Razorpay payment gateway. Please check your network connection.'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

/**
 * Opens Razorpay Standard Checkout popup.
 *
 * If VITE_RAZORPAY_KEY_ID is set in .env, it initiates real/test Razorpay payments.
 * If not set, it throws an error instructing to configure VITE_RAZORPAY_KEY_ID.
 */
export async function openRazorpayCheckout({
  amount,
  name = 'Window',
  description = 'In-app purchase',
  prefill,
  onSuccess,
  onDismiss,
}: RazorpayCheckoutOptions): Promise<void> {
  const key = env.razorpay.keyId
  if (!key) {
    throw new Error('Razorpay is not configured. Add VITE_RAZORPAY_KEY_ID to your .env file.')
  }

  await loadRazorpayScript()

  const RazorpayConstructor = (window as unknown as {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, callback: (response: unknown) => void) => void
    }
  }).Razorpay

  if (!RazorpayConstructor) {
    throw new Error('Razorpay SDK failed to initialize.')
  }

  return new Promise<void>((resolve, reject) => {
    const rzp = new RazorpayConstructor({
      key,
      amount: Math.round(amount * 100), // Convert INR to paise
      currency: 'INR',
      name,
      description,
      prefill: {
        name: prefill?.name || '',
        email: prefill?.email || '',
        contact: prefill?.contact || '',
      },
      theme: {
        color: '#22c55e', // Window eager-green brand color
      },
      modal: {
        ondismiss: () => {
          onDismiss?.()
          resolve()
        },
      },
      handler: async (response: RazorpaySuccessResponse) => {
        try {
          await onSuccess(response.razorpay_payment_id)
          resolve()
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to process order.'))
        }
      },
    })

    rzp.on('payment.failed', (response: unknown) => {
      const err = response as { error?: { description?: string } }
      const message = err.error?.description || 'Payment was declined or cancelled.'
      reject(new Error(message))
    })

    rzp.open()
  })
}
