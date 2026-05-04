import { Difficulty, LeetCodeProblem } from '../types';

// in-memory cache of problem lists by difficulty.
// fetched once from leetcode's graphql api then reused so we're not
// hammering their servers every time someone starts a game
const problemCache = new Map<Difficulty, LeetCodeProblem[]>();

// leetcode's graphql endpoint, this is unofficial and undocumented,
// could break at any time. the query pulls the full problem set for a
// given difficulty, filtered to only free (non-premium) problems
const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

const PROBLEMS_QUERY = `
  query problemsetQuestionList($categorySlug: String, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      filters: $filters
      limit: 3000
      skip: 0
    ) {
      questions: data {
        title
        titleSlug
        difficulty
        frontendQuestionId: questionFrontendId
        paidOnly: isPaidOnly
      }
    }
  }
`;

interface RawProblem {
  title: string;
  titleSlug: string;
  difficulty: string;
  frontendQuestionId: string;
  paidOnly: boolean;
}

// pulls all free problems for a difficulty level from leetcode's api.
// results get cached so subsequent calls are instant
async function fetchProblems(difficulty: Difficulty): Promise<LeetCodeProblem[]> {
  const cached = problemCache.get(difficulty);
  if (cached) return cached;

  const res = await fetch(LEETCODE_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: PROBLEMS_QUERY,
      variables: {
        categorySlug: '',
        filters: { difficulty: difficulty.toUpperCase() },
      },
    }),
  });

  if (!res.ok) throw new Error(`LeetCode API returned ${res.status}`);

  const json = await res.json();
  const raw: RawProblem[] = json.data.problemsetQuestionList.questions;

  // filter out premium problems, no point giving ppl a link they cant access
  const problems: LeetCodeProblem[] = raw
    .filter((p) => !p.paidOnly)
    .map((p) => ({
      title: p.title,
      titleSlug: p.titleSlug,
      difficulty: p.difficulty as Difficulty,
      frontendQuestionId: p.frontendQuestionId,
      url: `https://leetcode.com/problems/${p.titleSlug}/`,
    }));

  problemCache.set(difficulty, problems);
  console.log(`Cached ${problems.length} ${difficulty} problems from LeetCode`);
  return problems;
}

// picks a random problem from the pool for the given difficulty.
// pre-fetches if the cache is empty
export async function getRandomProblem(difficulty: Difficulty): Promise<LeetCodeProblem> {
  const problems = await fetchProblems(difficulty);
  if (problems.length === 0) {
    throw new Error(`No ${difficulty} problems available`);
  }
  const idx = Math.floor(Math.random() * problems.length);
  return problems[idx];
}

// call this on server start to warm the cache in the background.
// not awaited so it doesnt block startup
export function prefetchProblems() {
  const diffs: Difficulty[] = ['Easy', 'Medium', 'Hard'];
  for (const d of diffs) {
    fetchProblems(d).catch((err) => {
      console.warn(`Failed to prefetch ${d} problems:`, err.message);
    });
  }
}

// --- submission verification ---

// uses leetcode's public recentAcSubmissionList query to check if a user
// actually solved the problem. this query works without auth as long as the
// user's leetcode profile has submissions visible (which is the default)

const RECENT_AC_QUERY = `
  query recentAcSubmissionList($username: String!, $limit: Int) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      titleSlug
      timestamp
    }
  }
`;

export interface VerificationResult {
  valid: boolean;
  reason?: string;
}

// checks a user's recent accepted submissions on leetcode to see if they
// solved the given problem after the round started. pulls their last 20
// accepted submissions and looks for a match
export async function verifyCompletion(
  leetcodeUsername: string,
  expectedSlug: string,
  roundStartedAt: number,
): Promise<VerificationResult> {
  try {
    const res = await fetch(LEETCODE_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: RECENT_AC_QUERY,
        variables: { username: leetcodeUsername, limit: 20 },
      }),
    });

    if (!res.ok) {
      return { valid: false, reason: 'Failed to reach LeetCode API' };
    }

    const json = await res.json();
    const submissions = json.data?.recentAcSubmissionList;

    if (!submissions) {
      return { valid: false, reason: `LeetCode user "${leetcodeUsername}" not found or submissions are private` };
    }

    // look for an accepted submission on the right problem after the round started
    const match = submissions.find((s: { titleSlug: string; timestamp: string }) => {
      const submittedAt = parseInt(s.timestamp, 10) * 1000;
      return s.titleSlug === expectedSlug && submittedAt >= roundStartedAt;
    });

    if (!match) {
      return { valid: false, reason: 'No accepted submission found for this problem since the round started' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: 'Could not verify, LeetCode API error' };
  }
}
