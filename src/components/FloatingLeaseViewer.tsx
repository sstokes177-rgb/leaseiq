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

export function FloatingLeaseViewer({ pdfUrl, documentName, onClose }: FloatingLeaseViewerProps) {
  const [position, setPosition] = useState({ x: 80, y: 80 })
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [minimized, setMinimized] = useState(false)

  const isDraggingRef = useRef(false)
  const isResizingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 })

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only drag from title bar, not buttons
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    isDraggingRef.current = true
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
    document.body.style.userSelect = 'none'
  }, [position])

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizingRef.current = true
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height,
    }
    document.body.style.userSelect = 'none'
  }, [size])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        setPosition({
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        })
      }
      if (isResizingRef.current) {
        const dx = e.clientX - resizeStartRef.current.x
        const dy = e.clientY - resizeStartRef.current.y
        setSize({
          width: Math.max(MIN_WIDTH, resizeStartRef.current.w + dx),
          height: Math.max(MIN_HEIGHT, resizeStartRef.current.h + dy),
        })
      }
    }

    const handleMouseUp = () => {
      if (isDraggingRef.current || isResizingRef.current) {
        isDraggingRef.current = false
        isResizingRef.current = false
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
      className="fixed border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col"
      style={{
        zIndex: 40,
        left: position.x,
        top: position.y,
        width: size.width,
        height: minimized ? 'auto' : size.height,
        minWidth: MIN_WIDTH,
        minHeight: minimized ? undefined : MIN_HEIGHT,
        background: '#0a0c12',
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-900 shrink-0 cursor-grab active:cursor-grabbing"
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
        <div className="flex-1 relative min-h-0">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={documentName}
          />
          {/* Resize handle — bottom-right corner */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
            style={{ touchAction: 'none' }}
          >
            <svg
              className="w-4 h-4 text-gray-500"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14Z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
