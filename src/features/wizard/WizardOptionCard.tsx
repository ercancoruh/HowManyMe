import { Check } from "@phosphor-icons/react"
import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { springSnappy } from "@/lib/motion-presets"

type WizardOptionCardProps = {
  selected: boolean
  children: ReactNode
  label: ReactNode
  onActivateSelected?: () => void
}

export function WizardOptionCard({
  selected,
  children,
  label,
  onActivateSelected,
}: WizardOptionCardProps) {
  const reduced = useReducedMotion()

  return (
    <motion.label
      transition={springSnappy(reduced ?? undefined)}
      whileHover={reduced ? undefined : { scale: 1.008 }}
      whileTap={reduced ? undefined : { scale: 0.992 }}
      className={cn(
        "motion-safe-transition flex cursor-pointer items-center gap-3 rounded-xl border bg-card/50 p-3.5 shadow-sm backdrop-blur-sm",
        "hover:border-primary/35 hover:bg-muted/40",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25",
        selected &&
          "border-primary/55 bg-gradient-to-br from-primary/12 to-primary/5 ring-2 ring-primary/25",
      )}
      onClick={() => {
        if (selected) {
          onActivateSelected?.()
        }
      }}
    >
      {children}
      <span className="min-w-0 flex-1 font-medium leading-snug">{label}</span>
      {selected ? (
        <Check
          className="size-5 shrink-0 text-primary"
          weight="bold"
          aria-hidden
        />
      ) : (
        <span className="size-5 shrink-0" aria-hidden />
      )}
    </motion.label>
  )
}
