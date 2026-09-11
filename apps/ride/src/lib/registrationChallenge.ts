/**
 * Web port of rider-app/src/registrationChallenge.ts.
 *
 * The backend issues a hashcash-style puzzle (RegistrationChallengeService):
 * find a `solution` such that sha256(`${challenge}:${solution}`) starts with
 * `difficulty` hex zeros. It exists so registration cannot be scripted at
 * volume, and the challenge is single-use - the server deletes it atomically
 * on the first read, so a solution can never be replayed.
 *
 * Two things differ from the native version, both because the platform does:
 *
 *  - SubtleCrypto instead of expo-crypto. It is only available in a secure
 *    context (https, or localhost), which the site always is.
 *  - Hashing is synchronous-ish and local here rather than crossing a native
 *    bridge, so the batching that made the phone version faster would only add
 *    allocation. A plain loop is quicker on the web.
 *
 * The difficulty travels with the challenge, so raising it later can never
 * make an already-issued puzzle harder halfway through.
 */
const encoder = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function solveRegistrationChallenge(
  challenge: string,
  difficulty: number,
): Promise<string> {
  const prefix = '0'.repeat(difficulty);
  // No attempt cap, matching the native app: the default difficulty is 4,
  // which resolves in well under a second, and a cap would be a magic number
  // guarding a failure mode that does not exist.
  for (let counter = 0; ; counter++) {
    const solution = String(counter);
    if ((await sha256Hex(`${challenge}:${solution}`)).startsWith(prefix)) return solution;
  }
}
