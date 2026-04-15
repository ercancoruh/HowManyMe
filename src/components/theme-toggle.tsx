import { Moon, Sun } from "@phosphor-icons/react"

import { useTheme, type Theme } from "@/components/theme-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/i18n/useI18n"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()

  return (
    <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
      <SelectTrigger className="h-9 w-[140px] justify-between">
        <SelectValue placeholder={t.themeLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">
          <div className="flex items-center gap-2">
            <Sun size={14} />
            {t.themeLight}
          </div>
        </SelectItem>
        <SelectItem value="dark">
          <div className="flex items-center gap-2">
            <Moon size={14} />
            {t.themeDark}
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
