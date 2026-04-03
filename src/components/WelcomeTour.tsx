'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

interface TourStep {
  selector: string
  title: string
  message: string
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour-step="1"]',
    title: 'Your locations',
    message: 'Navigate your locations and portfolio from here.',
  },
  {
    selector: '[data-tour-step="2"]',
    title: 'Ask your lease anything',
    message: 'Ask your lease anything in plain English — like talking to a real estate advisor.',
  },
  {
    selector: '[data-tour-step="3"]',
    title: 'Upload your lease',
    message: 'Upload your lease PDF to unlock all AI features.',
  },
  {
    selector: '[data-tour-step="4"]',
    title: 'Stay informed',
    message: "We'll alert you about critical dates and completed analyses.",
  },
]

const LS_KEY = 'provelo_tour_completed'

export function WelcomeTour() {
  const [step, setStep] = useState(0)
  const [active, setActive] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY)) return
    } catch {
      return
    }
    const timer = setTimeout(() => setActive(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const updateRect = useCallback(() => {
    if (!active) return
    const current = TOUR_STEPS[step]
    if (!current) return
    const el = document.querySelector(current.selector)
    if (el) {
      setRect(el.getBoundingClientRect())
    } else {
      setRect(null)
    }
  }, [active, step])

  useEffect(() => {
    updateRect()
    const onResize = () => updateRect()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [updateRect])

  const close = useCallback(() => {
    setActive(false)
    try { localStorage.setItem(LS_KEY, '1') } catch { /* noop */ }
    cancelAnimationFrame(rafRef.current)
  }, [])

  const next = useCallback(() => {
    if (step + 1 >= TOUR_STEPS.length) {
      close()
    } else {
      setStep(s => s + 1)
    }
  }, [step, close])

  if (!active) return null

  const current = TOUR_STEPS[step]
  if (!current) return null

  // Tooltip positioning
  const pad = 12
  let tooltipTop = 0
  let tooltipLeft = 0
  let arrowClass = ''

  if (rect) {
    // Default: place below the element
    tooltipTop = rect.bottom + pad
    tooltipLeft = rect.left + rect.width / 2

    // If too close to bottom, place above
    if (rect.bottom + 200 > window.innerHeight) {
      tooltipTop = rect.top - pad
      arrowClass = 'bottom'
    } else {
      arrowClass = 'top'
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" />

      {/* Highlight cutout */}
      {rect && (
        <div
          className="absolute rounded-xl ring-2 ring-emerald-400/50 transition-all duration-300"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.50)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute max-w-[280px] rounded-lg p-4 shadow-xl transition-all duration-300"
        style={{
          top: arrowClass === 'bottom' ? 'auto' : tooltipTop,
          bottom: arrowClass === 'bottom' ? `${window.innerHeight - (rect?.top ?? 0) + pad}px` : 'auto',
          left: Math.max(16, Math.min(tooltipLeft - 140, window.innerWidth - 296)),
          background: 'rgba(15,17,25,0.97)',
          border: '1px solid rgba(16,185,129,0.25)',
          zIndex: 2,
        }}
      >
        <p className="font-semibold text-sm text-white mb-1">{current.title}</p>
        <p className="text-xs text-gray-400 leading-relaxed mb-4">{current.message}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{step + 1} of {TOUR_STEPS.length}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={close}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip tour
            </button>
            <button
              onClick={next}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: 'rgba(16,185,129,0.20)',
                border: '1px solid rgba(16,185,129,0.35)',
                color: '#34d399',
              }}
            >
              {step + 1 >= TOUR_STEPS.length ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
