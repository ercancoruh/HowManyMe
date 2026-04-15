import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/i18n/useI18n"
import type { Language } from "@/i18n/types"

const languageLabels: Record<Language, string> = {
  en: "English",
  tr: "Türkçe",
}

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n()

  return (
    <Select
      value={language}
      onValueChange={(value) => setLanguage(value as Language)}
    >
      <SelectTrigger className="h-9 w-[140px] justify-between">
        <SelectValue placeholder={t.languageLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{languageLabels.en}</SelectItem>
        <SelectItem value="tr">{languageLabels.tr}</SelectItem>
      </SelectContent>
    </Select>
  )
}
