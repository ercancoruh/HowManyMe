import type { Language } from "@/i18n/types"

export function formatWholeNumber(value: number, language: Language) {
  if (value < 1) {
    return "< 1"
  }

  const locale = language === "tr" ? "tr-TR" : "en-US"

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    useGrouping: true,
  }).format(Math.round(value))
}
