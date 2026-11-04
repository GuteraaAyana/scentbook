// Pure helpers for the activity feed, tested in feed.test.ts.

// Several lists, each already newest first (rankings, wears, reviews...),
// merged into one newest-first list of at most `limit` items.
export function mergeFeed<T extends { at: Date }>(lists: T[][], limit: number): T[] {
  return lists
    .flat()
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

const monthDay = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

// "just now", "45m", "5h", "3d", then the date: short, like an activity feed.
export function timeAgo(when: Date, now = new Date()) {
  const seconds = Math.max(0, (now.getTime() - when.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d`;
  return monthDay.format(when);
}
