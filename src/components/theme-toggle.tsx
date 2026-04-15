import { Moon, Sun, Monitor } from "@phosphor-icons/react"

import { useTheme } from "@/components/theme-provider"
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
    <Select value={theme} onValueChange={(value) => setTheme(value as typeof theme)}>
      <SelectTrigger className="w-[140px]">
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
        <SelectItem value="system">
          <div className="flex items-center gap-2">
            <Monitor size={14} />
            {t.themeSystem}
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
