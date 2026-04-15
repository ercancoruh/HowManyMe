import { LanguageToggle } from "@/components/language-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { WizardPage } from "@/features/wizard/WizardPage"
import { useI18n } from "@/i18n/useI18n"

export function App() {
  const { t } = useI18n()

  return (
    <main className="flex h-svh max-h-svh min-h-0 flex-col overflow-hidden bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden">
        <header className="shrink-0 flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t.appTitle}</h1>
            <p className="text-sm text-muted-foreground">{t.appSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>
        <div className="shrink-0 text-xs text-muted-foreground">{t.noAnswerHint}</div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WizardPage />
        </div>
      </div>
    </main>
  )
}

export default App
