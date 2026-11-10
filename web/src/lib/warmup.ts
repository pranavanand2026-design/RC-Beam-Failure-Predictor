/**
 * One shared clock for "how long has the API been waking up".
 * Started on the first page load (when we ping the API), so a loader shown later
 * continues from the real elapsed time instead of starting over at 0%.
 */
let startedAt: number | null = null;

export function markWarmupStart() {
  if (startedAt === null) startedAt = Date.now();
}

export function warmupStartedAt() {
  return startedAt;
}
