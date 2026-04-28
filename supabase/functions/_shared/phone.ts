/** Normalize to digits only for comparison (E.164 stored with + in DB). */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Best-effort E.164 for US if 10 digits; otherwise require leading + in input. */
export function toE164(phone: string): string | null {
  const d = digitsOnly(phone);
  if (!d) return null;
  if (phone.trim().startsWith("+")) {
    return `+${d}`;
  }
  if (d.length === 10) {
    return `+1${d}`;
  }
  if (d.length === 11 && d.startsWith("1")) {
    return `+${d}`;
  }
  return d.length >= 10 ? `+${d}` : null;
}

export function phonesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return digitsOnly(a) === digitsOnly(b);
}
