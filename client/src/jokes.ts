// Light, friendly quips the narrator reads out about whoever's leading the
// board after each question. Kept PG and good-natured — this is a party.

const LEADER_JOKES: ((n: string) => string)[] = [
  (n) => `${n} is out in front. Everyone else, this is the part where you start bribing the host.`,
  (n) => `${n} takes the lead. Suspiciously good at this — has anyone checked their phone for the answers?`,
  (n) => `${n} is on top. Somewhere, a very competitive family group chat is about to get loud.`,
  (n) => `${n} leads the pack. Humble in victory, we hope. We really hope.`,
  (n) => `${n} is number one. Please contain your celebrations to a reasonable three minutes.`,
  (n) => `${n} is winning. Coincidence? Absolutely. But let them have this.`,
  (n) => `${n} storms into first. The trophy is imaginary, but the bragging rights are forever.`,
  (n) => `${n} is ahead. Statistically, that means everyone else is behind. Bold strategy.`,
  (n) => `${n} tops the board. Beginner's luck, surely. Surely.`,
  (n) => `${n} is in the lead — proof that reading the question actually helps.`,
  (n) => `${n} pulls ahead. The rest of you: it's not over, it just feels that way.`,
  (n) => `${n} leads. Somewhere a proud parent is nodding. Somewhere else, a rival is plotting.`,
];

const TIE_JOKES: (() => string)[] = [
  () => `It's a dead heat at the top. Nobody move — we don't want to jinx it.`,
  () => `We've got a tie for first. The tension is delicious. Someone break the deadlock, please.`,
  () => `A tie at the top! Democracy is beautiful, but this is trivia, so someone please pull ahead.`,
];

const EMPTY_JOKES: (() => string)[] = [
  () => `Nobody's on the board yet. A bold and mysterious start from everyone involved.`,
  () => `No points so far — either these questions are brutal or someone unplugged the buzzers.`,
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// leader: name of #1, or "" if no one has scored; tie: true when #1 and #2 are level.
export function leaderQuip(leader: string, tie: boolean): string {
  if (!leader) return pick(EMPTY_JOKES)();
  if (tie) return pick(TIE_JOKES)();
  return pick(LEADER_JOKES)(leader);
}
