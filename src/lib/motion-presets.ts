import type { Transition, Variant } from "motion/react"

export const instantTransition: Transition = { duration: 0 }

export function springSoft(reduced: boolean | undefined): Transition {
  if (reduced) return { duration: 0.15, ease: "easeOut" }
  return { type: "spring", stiffness: 320, damping: 28, mass: 0.75 }
}

export function springSnappy(reduced: boolean | undefined): Transition {
  if (reduced) return { duration: 0.12, ease: "easeOut" }
  return { type: "spring", stiffness: 420, damping: 32, mass: 0.65 }
}

export function fadeSlideVariants(reduced: boolean | undefined): {
  initial: Variant
  animate: Variant
  exit: Variant
} {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    }
  }
  return {
    initial: { opacity: 0, y: 10, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -6, filter: "blur(3px)" },
  }
}
