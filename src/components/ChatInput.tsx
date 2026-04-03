'use client'

import { useRef, type KeyboardEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SendHorizontal } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  disabled?: boolean
}

export function ChatInput({ value, onChange, onSubmit, isLoading, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && value.trim()) onSubmit()
    }
  }

  return (
    <div className="glass-input p-2">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your lease… e.g. 'Who pays for HVAC repairs?'"
          className="min-h-[48px] max-h-[180px] resize-none flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:border-0 text-base sm:text-sm placeholder:text-muted-foreground/50"
          disabled={isLoading || disabled}
          rows={2}
        />
        <Button
          onClick={onSubmit}
          disabled={isLoading || !value.trim() || disabled}
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          aria-label="Send message"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
