/**
 * Spelling diff algorithm using Damerau-Levenshtein with backtrace.
 * Produces operation-level breakdown of user spelling vs correct spelling.
 */

export type DiffOpType =
  | 'match'
  | 'substitution'
  | 'addition'
  | 'omission'
  | 'transposition';

export interface DiffOp {
  type: DiffOpType;
  correctChar?: string;
  userChar?: string;
  correctIndex?: number;
  userIndex?: number;
}

export interface DiffSummary {
  substitutions: number;
  omissions: number;
  additions: number;
  transpositions: number;
}

export interface SpellingDiffResult {
  ops: DiffOp[];
  summary: DiffSummary;
}

/**
 * Compute the diff between correct spelling and user input.
 * Uses Damerau-Levenshtein with backtrace to identify operations.
 */
export function computeSpellingDiff(
  correct: string,
  userInput: string
): SpellingDiffResult {
  const c = correct.toLowerCase();
  const u = userInput.toLowerCase();

  const m = c.length;
  const n = u.length;

  // DP table for edit distance
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill DP table with Damerau-Levenshtein
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = c[i - 1] === u[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion (omission in user input)
        dp[i][j - 1] + 1, // insertion (addition in user input)
        dp[i - 1][j - 1] + cost // substitution or match
      );

      // Transposition check
      if (
        i > 1 &&
        j > 1 &&
        c[i - 1] === u[j - 2] &&
        c[i - 2] === u[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }

  // Backtrace to build operations
  const ops: DiffOp[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && c[i - 1] === u[j - 1]) {
      // Match
      ops.unshift({
        type: 'match',
        correctChar: correct[i - 1],
        userChar: userInput[j - 1],
        correctIndex: i - 1,
        userIndex: j - 1,
      });
      i--;
      j--;
    } else if (
      i > 1 &&
      j > 1 &&
      c[i - 1] === u[j - 2] &&
      c[i - 2] === u[j - 1] &&
      dp[i][j] === dp[i - 2][j - 2] + 1
    ) {
      // Transposition
      ops.unshift({
        type: 'transposition',
        correctChar: correct[i - 2] + correct[i - 1],
        userChar: userInput[j - 2] + userInput[j - 1],
        correctIndex: i - 2,
        userIndex: j - 2,
      });
      i -= 2;
      j -= 2;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      // Addition (user added a letter)
      ops.unshift({
        type: 'addition',
        userChar: userInput[j - 1],
        userIndex: j - 1,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] <= dp[i][j - 1])) {
      if (j > 0 && dp[i - 1][j - 1] <= dp[i - 1][j]) {
        // Substitution
        ops.unshift({
          type: 'substitution',
          correctChar: correct[i - 1],
          userChar: userInput[j - 1],
          correctIndex: i - 1,
          userIndex: j - 1,
        });
        i--;
        j--;
      } else {
        // Omission (user missed a letter)
        ops.unshift({
          type: 'omission',
          correctChar: correct[i - 1],
          correctIndex: i - 1,
        });
        i--;
      }
    } else if (i > 0 && j > 0) {
      // Substitution
      ops.unshift({
        type: 'substitution',
        correctChar: correct[i - 1],
        userChar: userInput[j - 1],
        correctIndex: i - 1,
        userIndex: j - 1,
      });
      i--;
      j--;
    }
  }

  // Build summary
  const summary: DiffSummary = {
    substitutions: 0,
    omissions: 0,
    additions: 0,
    transpositions: 0,
  };

  for (const op of ops) {
    if (op.type === 'substitution') summary.substitutions++;
    if (op.type === 'omission') summary.omissions++;
    if (op.type === 'addition') summary.additions++;
    if (op.type === 'transposition') summary.transpositions++;
  }

  return { ops, summary };
}

/**
 * Get a human-readable description of the primary error type.
 */
export function getErrorDescription(summary: DiffSummary): string {
  const parts: string[] = [];

  if (summary.transpositions > 0) {
    parts.push(
      summary.transpositions === 1
        ? 'swapped letters'
        : `${summary.transpositions} letter swaps`
    );
  }
  if (summary.substitutions > 0) {
    parts.push(
      summary.substitutions === 1
        ? 'wrong letter'
        : `${summary.substitutions} wrong letters`
    );
  }
  if (summary.omissions > 0) {
    parts.push(
      summary.omissions === 1
        ? 'missing letter'
        : `${summary.omissions} missing letters`
    );
  }
  if (summary.additions > 0) {
    parts.push(
      summary.additions === 1
        ? 'extra letter'
        : `${summary.additions} extra letters`
    );
  }

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}
