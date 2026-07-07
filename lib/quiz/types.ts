/**
 * Shared quiz types. The bank shape mirrors the ArabSyntax mobile-app export
 * verbatim (unknown fields preserved). The correct answer lives ONLY in the
 * server-side {@link Question}; it is never part of {@link ClientQuestion}, the
 * shape sent to the browser.
 */

/** The seven graded stages. Questions in `unstaged.json` carry no stage. */
export type Stage =
  | 'primary'
  | 'midOne'
  | 'midTwo'
  | 'midThree'
  | 'secondaryOne'
  | 'secondaryTwo'
  | 'secondaryThree';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** A raw question as exported by the app (SERVER-ONLY — carries `correctIndex`). */
export interface Question {
  questionID: string;
  question: string;
  difficulty?: Difficulty;
  stage?: Stage;
  mClass?: string;
  lessonId?: string;
  hint?: string;
  options: string[];
  correctIndex: number;
  // Forward-compatible: keep any future fields the export adds.
  [key: string]: unknown;
}

/**
 * A question as sent to the browser: options are already shuffled for display
 * and there is NO correct-answer field. This is the only question shape that
 * ever crosses the network to the client.
 */
export interface ClientQuestion {
  id: string;
  question: string;
  hint?: string;
  options: string[];
  /**
   * Slug of the lesson this question tests, for a post-quiz "review the lesson"
   * link. Set only when the id names a real lesson page. Not a secret — it is
   * topic metadata, never the answer.
   */
  lessonId?: string;
}

/**
 * Per-question grading key carried in the signed token: the question id and the
 * option permutation used for this response (presented index → original index),
 * so the server can map the user's choice back without any stored session. The
 * correct answer is NOT here — it is re-derived server-side from the bank.
 */
export interface TokenItem {
  id: string;
  perm: number[];
}

/** GET /api/quiz/[id] response. */
export interface QuizPayload {
  token: string;
  questions: ClientQuestion[];
}

/** POST /api/quiz/[id]/submit request body. */
export interface SubmitRequest {
  token: string;
  /** Chosen option index (as presented) per question, or null if unanswered. */
  answers: (number | null)[];
}

/** Per-question grading outcome. `correctIndex` is in the presented order. */
export interface QuestionResult {
  questionId: string;
  correct: boolean;
  correctIndex: number;
}

/** POST submit response: score plus per-question outcomes. */
export interface GradeResult {
  score: number;
  total: number;
  results: QuestionResult[];
}

/** Filter values chosen on the setup screen. `'all'` is valid everywhere. */
export interface QuizFilters {
  marhala: string;
  year: string;
  difficulty: Difficulty | 'all';
}
