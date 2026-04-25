/**
 * Anti-bot utilities (silent, no user friction).
 *
 * Strategy:
 * 1. Honeypot field — a hidden input that humans never see/fill, but bots do.
 * 2. Time-trap — bots typically submit forms in <2s; humans take longer.
 *
 * Both checks run client-side and silently reject suspect submissions
 * (we pretend success so bots don't learn what triggered the block).
 */

export const HONEYPOT_FIELD_NAME = "website_url";
export const MIN_FORM_FILL_MS = 2000;

export interface BotCheckInput {
  honeypotValue: string;
  formOpenedAt: number;
}

export function isLikelyBot({ honeypotValue, formOpenedAt }: BotCheckInput): boolean {
  if (honeypotValue && honeypotValue.trim().length > 0) return true;
  const elapsed = Date.now() - formOpenedAt;
  if (elapsed < MIN_FORM_FILL_MS) return true;
  return false;
}

/**
 * Inline style for the honeypot input — hides it from humans (visual + a11y)
 * while remaining a real DOM input that automated form-fillers will populate.
 */
export const honeypotStyle: React.CSSProperties = {
  position: "absolute",
  left: "-10000px",
  top: "auto",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
};
