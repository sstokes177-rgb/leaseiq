'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Minus, Maximize2, GripVertical } from 'lucide-react'

interface FloatingLeaseViewerProps {
  pdfUrl: string
  documentName: string
  onClose: () => void
}

const DEFAULT_WIDTH = 600
const DEFAULT_HEIGHT = 500
const MIN_WIDTH = 300
const MIN_HEIGHT = 300
const HANDLE = 8

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export function FloatingLeaseViewer({ pdfUrl, documentName, onClose }: FloatingLeaseViewerProps) {
  const [position, setPosition] = useState({ x: 80, y: 80 })
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [minimized, setMinimized] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const isDraggingRef = useRef(false)
  const resizeDirRef = useRef<ResizeDir | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0, posX: 0, posY: 0 })
  const posRef = useRef(position)
  const sizeRef = useRef(size)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  posRef.current = position
  sizeRef.current = size

  // Listen for tab change events (FIX 2: animate to left on chat tab)
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab
      if (tab === 'chat') {
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
        setTransitioning(true)
        setPosition(prev => ({ ...prev, x: 16 }))
        transitionTimerRef.current = setTimeout(() => setTransitioning(false), 300)
      }
    }
    window.addEventListener('location-tab-change', handler)
    return () => {
      window.removeEventListener('location-tab-change', handler)
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [])

  // Drag
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    isDraggingRef.current = true
    dragOffsetRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    }
    setTransitioning(false)
    setInteracting(true)
    document.body.style.userSelect = 'none'
  }, [])

  // Resize from any edge/corner
  const handleResizeStart = useCallback((dir: ResizeDir) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeDirRef.current = dir
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: sizeRef.current.width,
      h: sizeRef.current.height,
      posX: posRef.current.x,
      posY: posRef.current.y,
    }
    setTransitioning(false)
    setInteracting(true)
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        setPosition({
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        })
        return
      }

      const dir = resizeDirRef.current
      if (!dir) return

      const dx = e.clientX - resizeStartRef.current.x
      const dy = e.clientY - resizeStartRef.current.y
      const s = resizeStartRef.current
      const maxW = window.innerWidth * 0.9
      const maxH = window.innerHeight * 0.9

      let newW = s.w
      let newH = s.h
      let newX = s.posX
      let newY = s.posY

      if (dir.includes('e')) newW = s.w + dx
      if (dir.includes('w')) newW = s.w - dx
      if (dir.includes('s')) newH = s.h + dy
      if (dir.includes('n')) newH = s.h - dy

      // Clamp size
      newW = Math.max(MIN_WIDTH, Math.min(maxW, newW))
      newH = Math.max(MIN_HEIGHT, Math.min(maxH, newH))

      // Adjust position so the opposite edge stays fixed
      if (dir.includes('w')) newX = s.posX + s.w - newW
      if (dir.includes('n')) newY = s.posY + s.h - newH

      // Prevent going off screen
      if (newX < 0) newX = 0
      if (newY < 0) newY = 0

      setSize({ width: newW, height: newH })
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      if (isDraggingRef.current || resizeDirRef.current) {
        isDraggingRef.current = false
        resizeDirRef.current = null
        setInteracting(false)
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleMaximize = useCallback(() => {
    setSize({
      width: window.innerWidth * 0.8,
      height: window.innerHeight * 0.8,
    })
    setPosition({
      x: window.innerWidth * 0.1,
      y: window.innerHeight * 0.1,
    })
    setMinimized(false)
  }, [])

  const handleMinimize = useCallback(() => {
    setMinimized(prev => !prev)
  }, [])

  return (
    <div
      className="fixed border border-white/10 rounded-xl shadow-2xl flex flex-col"
      style={{
        zIndex: 40,
        left: position.x,
        top: position.y,
        width: size.width,
        height: minimized ? 'auto' : size.height,
        minWidth: MIN_WIDTH,
        minHeight: minimized ? undefined : MIN_HEIGHT,
        background: '#0a0c12',
        transition: transitioning ? 'left 0.3s ease, top 0.3s ease' : undefined,
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-900 shrink-0 cursor-grab active:cursor-grabbing rounded-t-xl"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="h-4 w-4 text-gray-500 shrink-0" />
          <span className="text-sm text-white/80 font-medium truncate">{documentName}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleMinimize}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Maximize"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-red-500/20 transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body — hidden when minimized */}
      {!minimized && (
        <div className="flex-1 relative min-h-0 overflow-hidden rounded-b-xl">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={documentName}
          />
          {/* Overlay to prevent iframe from stealing mouse events during drag/resize */}
          {interacting && <div className="absolute inset-0 z-10" />}
        </div>
      )}

      {/* Resize handles — 8 invisible hit zones on all edges and corners */}
      {!minimized && (
        <>
          {/* Edges */}
          <div onMouseDown={handleResizeStart('n')} className="absolute cursor-ns-resize" style={{ top: 0, left: HANDLE, right: HANDLE, height: HANDLE }} />
          <div onMouseDown={handleResizeStart('s')} className="absolute cursor-ns-resize" style={{ bottom: 0, left: HANDLE, right: HANDLE, height: HANDLE }} />
          <div onMouseDown={handleResizeStart('w')} className="absolute cursor-ew-resize" style={{ left: 0, top: HANDLE, bottom: HANDLE, width: HANDLE }} />
          <div onMouseDown={handleResizeStart('e')} className="absolute cursor-ew-resize" style={{ right: 0, top: HANDLE, bottom: HANDLE, width: HANDLE }} />
          {/* Corners */}
          <div onMouseDown={handleResizeStart('nw')} className="absolute cursor-nwse-resize" style={{ top: 0, left: 0, width: HANDLE, height: HANDLE }} />
          <div onMouseDown={handleResizeStart('ne')} className="absolute cursor-nesw-resize" style={{ top: 0, right: 0, width: HANDLE, height: HANDLE }} />
          <div onMouseDown={handleResizeStart('sw')} className="absolute cursor-nesw-resize" style={{ bottom: 0, left: 0, width: HANDLE, height: HANDLE }} />
          <div onMouseDown={handleResizeStart('se')} className="absolute cursor-nwse-resize" style={{ bottom: 0, right: 0, width: HANDLE, height: HANDLE }} />
        </>
      )}
    </div>
  )
}
