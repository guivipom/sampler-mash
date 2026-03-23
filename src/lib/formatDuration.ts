/**
 * Formats a duration in seconds as M:SS.d
 * Examples:
 *   0      -> "0:00.0"
 *   2.5    -> "0:02.5"
 *   65.32  -> "1:05.3"
 *   125.789 -> "2:05.7"
 */
export function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const tenths = Math.floor(Math.round((totalSeconds % 1) * 100) / 10);

  const paddedSecs = secs.toString().padStart(2, "0");
  return `${minutes.toString()}:${paddedSecs}.${tenths.toString()}`;
}
