/** Stage colours (v2 §2.4) for the Numbers and Rules pages. */
export const STAGE = {
  SKIRMISH: { color: "#4fc0e6", edge: "#16465a", bg: "rgba(79, 192, 230, 0.08)" },
  CLASH: { color: "#f2a23c", edge: "#6b3e12", bg: "rgba(242, 162, 60, 0.08)" },
  PRESS: { color: "#da7ab0", edge: "#5c2245", bg: "rgba(218, 122, 176, 0.08)" },
  COHESION: { color: "#52c98a", edge: "#1e4a32", bg: "rgba(82, 201, 138, 0.08)" },
  BREAK: { color: "#d9633c", edge: "#6e3620", bg: "rgba(217, 99, 60, 0.08)" },
  ALWAYS: { color: "#f2ecdd", edge: "#4a453c", bg: "transparent" },
  DRAFT: { color: "#b3ac9c", edge: "#4a453c", bg: "transparent" },
} as const;
export type StageKey = keyof typeof STAGE;
