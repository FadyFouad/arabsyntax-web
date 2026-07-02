/**
 * Tree tunables (web subset of the mobile data-model §6).
 *
 * The quiz/pass tunables are intentionally omitted — the web app has no quiz
 * feature, so every node is content-gated. Only the layout tunable applies.
 */

/** Tiers wider than this wrap into additional visual rows within their band. */
export const MAX_NODES_PER_ROW = 5;
