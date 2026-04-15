import { useLanguage } from "@/i18n/LanguageProvider"

export function useI18n() {
  const { dictionary, language, setLanguage } = useLanguage()

  return {
    t: dictionary,
    language,
    setLanguage,
  }
}
