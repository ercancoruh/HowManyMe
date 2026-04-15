/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

import { enDictionary } from "@/i18n/dictionaries/en"
import { trDictionary } from "@/i18n/dictionaries/tr"
import type { Dictionary, Language } from "@/i18n/types"

type LanguageProviderValue = {
  language: Language
  setLanguage: (language: Language) => void
  dictionary: Dictionary
}

const dictionaries: Record<Language, Dictionary> = {
  en: enDictionary,
  tr: trDictionary,
}

const LanguageContext = createContext<LanguageProviderValue | undefined>(
  undefined
)

type LanguageProviderProps = {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>("en")

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      dictionary: dictionaries[language],
    }),
    [language]
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }

  return context
}
