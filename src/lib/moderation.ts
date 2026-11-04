// Rules for reporting reviews and for rate limits, kept pure so they can be
// tested (moderation.test.ts).

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or advertising" },
  { value: "offensive", label: "Abusive or offensive" },
  { value: "off_topic", label: "Not about this fragrance" },
  { value: "other", label: "Something else" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

const DETAILS_MAX = 500;
const OTHER_MIN = 10;

// A review reported by this many different people is hidden until a
// moderator looks at it. High enough that one person can't hide a review they
// simply disagree with.
export const AUTO_HIDE_AT = 3;

export function shouldAutoHide(openReports: number) {
  return openReports >= AUTO_HIDE_AT;
}

export function validateReport(input: { reason: string; details: string }):
  | { ok: true; value: { reason: ReportReason; details: string | null } }
  | { ok: false; errors: { reason?: string; details?: string } } {
  const details = input.details.trim();
  const reason = REPORT_REASONS.find((r) => r.value === input.reason)?.value;
  const errors: { reason?: string; details?: string } = {};

  if (!reason) errors.reason = "Choose a reason.";
  else if (reason === "other" && details.length < OTHER_MIN) errors.details = "Tell us briefly what's wrong.";
  if (details.length > DETAILS_MAX) errors.details = `Keep it to ${DETAILS_MAX} characters.`;

  if (Object.keys(errors).length > 0 || !reason) return { ok: false, errors };
  return { ok: true, value: { reason, details: details || null } };
}

// A fixed-window rate limit: at most `max` actions per `windowMs`. Given the
// current window (or none yet), decides whether this action is allowed and
// what the window looks like afterwards. A refused action isn't counted.
export function nextLimitWindow(
  current: { count: number; windowStart: Date } | null,
  now: Date,
  rule: { max: number; windowMs: number },
): { count: number; windowStart: Date; allowed: boolean; retryAfterSeconds?: number } {
  if (!current || now.getTime() - current.windowStart.getTime() > rule.windowMs) {
    return { count: 1, windowStart: now, allowed: true };
  }
  if (current.count < rule.max) {
    return { count: current.count + 1, windowStart: current.windowStart, allowed: true };
  }
  const resetsAt = current.windowStart.getTime() + rule.windowMs;
  return {
    count: current.count,
    windowStart: current.windowStart,
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((resetsAt - now.getTime()) / 1000)),
  };
}
