import { motion, useReducedMotion } from "motion/react"

import { LanguageToggle } from "@/components/language-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { WizardPage } from "@/features/wizard/WizardPage"
import { useI18n } from "@/i18n/useI18n"
import { springSoft } from "@/lib/motion-presets"

export function App() {
  const { t } = useI18n()
  const reduced = useReducedMotion()

  return (
    <motion.main
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft(reduced ?? undefined)}
      className="bg-app-mesh flex h-svh max-h-svh min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden">
        <header className="from-card/90 shrink-0 flex flex-col gap-4 rounded-2xl border border-border/70 bg-gradient-to-br to-card/40 p-4 shadow-md ring-1 ring-foreground/5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between dark:to-card/25">
          <div className="space-y-1">
            <h1 className="font-heading text-balance text-2xl font-semibold tracking-tight">
              {t.appTitle}
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">{t.appSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...springSoft(reduced ?? undefined), delay: reduced ? 0 : 0.06 }}
          className="text-muted-foreground shrink-0 text-xs"
        >
          {t.noAnswerHint}
        </motion.div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WizardPage />
        </div>
      </div>
    </motion.main>
  )
}

export default App
