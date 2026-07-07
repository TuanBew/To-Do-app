import type { SortKey } from "./types";

export const ACCENT = "#ea580c";
export const ACCENT_SOFT = ACCENT + "0c";

export const INK = "#22201c";
export const INK_MUTED = "#77716a";
export const INK_FAINT = "#9a9488";
export const INK_QUIET = "#8a8478";
export const BORDER = "#e4e0d8";
export const BORDER_SOFT = "#ece8e0";
export const SIDEBAR_BORDER = "#e7e3da";
export const SIDEBAR_BG = "#f3f1ec";
export const CANVAS_BG = "#faf9f6";
export const DANGER = "#c0392b";
export const DANGER_SOFT = "#fbe9e6";

export const TAG_PALETTE = [
  { bg: "#e7edfb", fg: "#3555a8" },
  { bg: "#f2e9fb", fg: "#7440ab" },
  { bg: "#e5f4ea", fg: "#2f7d4c" },
  { bg: "#faeee2", fg: "#a15b25" },
  { bg: "#e3f3f4", fg: "#2a7d84" },
  { bg: "#fbe9f1", fg: "#a34472" },
] as const;

export const PRIORITY_META = {
  high: { label: "High", color: "#dc4b34", bg: "#dc4b3414" },
  medium: { label: "Medium", color: "#c07d1f", bg: "#c07d1f14" },
  low: { label: "Low", color: "#3b82c4", bg: "#3b82c414" },
} as const;

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "dueDate", label: "Due date" },
  { key: "priority", label: "Priority" },
  { key: "alpha", label: "A–Z" },
  { key: "newest", label: "Newest" },
  { key: "manual", label: "Manual" },
];

export const PRESET_TAGS = ["Work", "Personal", "Design", "Marketing", "Learning", "Health", "Home"];

export const VIEW_TITLES: Record<string, string> = {
  all: "All Tasks",
  today: "Today",
  upcoming: "Upcoming",
  completed: "Completed",
};
