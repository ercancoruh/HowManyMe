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
      className="bg-app-mesh flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden overscroll-none px-4 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:ps-[max(1.5rem,env(safe-area-inset-left))] sm:pe-[max(1.5rem,env(safe-area-inset-right))] sm:pt-[max(1.5rem,env(safe-area-inset-top))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:h-svh lg:max-h-svh"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden">
        <header className="from-card/90 shrink-0 flex flex-row items-start justify-between gap-3 rounded-2xl border border-border/70 bg-gradient-to-br to-card/40 p-4 shadow-md ring-1 ring-foreground/5 backdrop-blur-md sm:items-center dark:to-card/25">
          <div className="min-w-0 flex-1 space-y-1 pr-1">
            <h1 className="font-heading text-balance text-2xl font-semibold tracking-tight">
              {t.appTitle}
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">{t.appSubtitle}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WizardPage />
        </div>
      </div>
    </motion.main>
  )
}

export default App
