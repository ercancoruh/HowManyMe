/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

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
const LANGUAGE_STORAGE_KEY = "language"

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "tr"
}

type LanguageProviderProps = {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isLanguage(savedLanguage)) {
      return savedLanguage
    }
    return "en"
  })

  const setLanguage = useCallback((nextLanguage: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    setLanguageState(nextLanguage)
  }, [])

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) {
        return
      }
      if (event.key !== LANGUAGE_STORAGE_KEY) {
        return
      }
      if (isLanguage(event.newValue)) {
        setLanguageState(event.newValue)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      dictionary: dictionaries[language],
    }),
    [language, setLanguage]
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
