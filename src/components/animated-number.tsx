import { animate, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"

type AnimatedNumberProps = {
  value: number
  format: (n: number) => string
  className?: string
}

export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const latestRef = useRef(value)

  useEffect(() => {
    if (reduced) {
      latestRef.current = value
      return
    }
    const from = latestRef.current
    latestRef.current = value
    const controls = animate(from, value, {
      type: "spring",
      stiffness: 200,
      damping: 26,
      mass: 0.55,
      onUpdate: (v) => setDisplay(v),
      onComplete: () => {
        latestRef.current = value
        setDisplay(value)
      },
    })
    return () => controls.stop()
  }, [value, reduced])

  const shown = reduced ? value : display

  return <span className={className}>{format(Math.round(shown))}</span>
}
