import { z } from 'zod';

/** One word and its grammatical analysis. `irab` may contain `\n` separating
 *  the parse of a compound word's components. */
export const i3rabWordSchema = z.object({
  word: z.string().min(1),
  irab: z.string().min(1),
});

/** Per-sentence file contract (FR1). `slug` must equal the filename. */
export const i3rabSentenceSchema = z.object({
  sentence: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  lessonName: z.string().optional(),
  words: z.array(i3rabWordSchema).min(1),
  explanation: z.string(), // required key; may be empty
});

export type I3rabWord = z.infer<typeof i3rabWordSchema>;
export type I3rabSentence = z.infer<typeof i3rabSentenceSchema>;
