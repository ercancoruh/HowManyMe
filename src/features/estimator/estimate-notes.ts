import type { Dictionary } from "@/i18n/types"

/** İç not sabitleri — UI’da `formatEstimateNote` ile çevrilir. */
export const ESTIMATE_NOTE_BASELINE = "__estimate.note.baseline__"
export const ESTIMATE_NOTE_EXTREMELY_RARE = "__estimate.note.extremely_rare__"

export function formatEstimateNote(note: string, t: Dictionary): string {
  if (note === ESTIMATE_NOTE_BASELINE) {
    return t.estimateNoteBaseline
  }
  if (note === ESTIMATE_NOTE_EXTREMELY_RARE) {
    return t.estimateNoteExtremelyRare
  }
  return note
}
