import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Checks an `Authorization: Bearer <secret>` header in constant time. Both sides are
 * HMAC'd with a random key first so timingSafeEqual gets equal-length inputs.
 * A missing secret never authorizes.
 */
export function isAuthorizedCron(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  const key = randomBytes(32);
  const a = createHmac("sha256", key).update(authorization).digest();
  const b = createHmac("sha256", key).update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}
