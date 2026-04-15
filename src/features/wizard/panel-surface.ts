/** Dış katman: gölge/border; overflow yok — üst overflow-hidden ile gölge kesilmez. */
export const PANEL_FRAME_CLASS =
  "flex h-full min-h-0 min-w-0 flex-col rounded-2xl border border-border/80 bg-card/95 text-card-foreground shadow-lg ring-1 ring-foreground/5 backdrop-blur-md dark:bg-card/90"

/** İç katman: köşe + içerik kırpması. */
export const PANEL_INNER_CLASS =
  "flex min-h-0 h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl"
