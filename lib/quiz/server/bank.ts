import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseManifest } from '../manifest';
import type { Difficulty, Question } from '../types';

/**
 * Server-only question bank. The JSON lives under `content/quiz/` (bundled into
 * the Worker, never a public asset) and is read at request time the same way the
 * mutun/lessons/i3rab loaders read their content — traced via
 * `outputFileTracingIncludes` in next.config.ts and the wrangler `content/**`
 * Text rule. Parsed once and cached for the lifetime of the isolate.
 *
 * The correct answer (`correctIndex`) exists only here; it is never serialised
 * into anything sent to the browser.
 */

const QUIZ_DIR = path.join(process.cwd(), 'content', 'quiz');

interface Bank {
  /** questions grouped by manifest stage key (`primary`, …, `unstaged`). */
  byStage: Map<string, Question[]>;
  /** every question by id, for grading. */
  byId: Map<string, Question>;
}

let bankCache: Bank | null = null;

function isValidQuestion(q: unknown): q is Question {
  if (!q || typeof q !== 'object') return false;
  const obj = q as Record<string, unknown>;
  return (
    typeof obj.questionID === 'string' &&
    typeof obj.question === 'string' &&
    Array.isArray(obj.options) &&
    obj.options.length >= 2 &&
    obj.options.every((o) => typeof o === 'string') &&
    typeof obj.correctIndex === 'number' &&
    obj.correctIndex >= 0 &&
    obj.correctIndex < obj.options.length
  );
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(path.join(QUIZ_DIR, file), 'utf8'));
}

function loadBank(): Bank {
  if (bankCache) return bankCache;

  const entries = parseManifest(readJson('manifest.json'));
  const byStage = new Map<string, Question[]>();
  const byId = new Map<string, Question>();

  for (const { file, stage } of entries) {
    let raw: unknown;
    try {
      raw = readJson(file);
    } catch (error) {
      // A missing/broken file must not take down the whole bank.
      console.error(`[quiz] failed to read ${file}:`, error);
      continue;
    }
    const questions = (Array.isArray(raw) ? raw : []).filter(isValidQuestion);
    byStage.set(stage, questions);
    for (const q of questions) byId.set(q.questionID, q);
  }

  bankCache = { byStage, byId };
  return bankCache;
}

/** Look up a single question by id (used for grading). */
export function getQuestionById(id: string): Question | undefined {
  return loadBank().byId.get(id);
}

/**
 * The pool of questions for the given stage keys, optionally narrowed to one
 * difficulty. Unknown stage keys contribute nothing.
 */
export function getPool(stageKeys: string[], difficulty: Difficulty | 'all'): Question[] {
  const bank = loadBank();
  const pool: Question[] = [];
  for (const key of new Set(stageKeys)) {
    const group = bank.byStage.get(key);
    if (group) pool.push(...group);
  }
  return difficulty === 'all' ? pool : pool.filter((q) => q.difficulty === difficulty);
}

/** Test-only: drop the cache so a fixture change is picked up. */
export function _resetBankCache(): void {
  bankCache = null;
}
