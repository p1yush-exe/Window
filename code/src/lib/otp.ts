/**
 * Simulated one-time-password verification. Real SMS/email delivery is not
 * wired up yet; the code 0000 is accepted for any phone number or email.
 */
export const DEMO_OTP = '0000'

export function isValidPhone(v: string) {
  return /^\+?[0-9]{10,13}$/.test(v.replace(/[\s-]/g, ''))
}

export function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export async function sendOtp(_target: string): Promise<void> {
  // Simulated: pretend a code was sent.
  await new Promise((r) => setTimeout(r, 400))
}

export async function verifyOtp(_target: string, code: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 300))
  return code.trim() === DEMO_OTP
}
