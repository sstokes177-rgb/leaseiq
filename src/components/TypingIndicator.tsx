export function TypingIndicator() {
  return (
    <div className="flex justify-start message-in">
      <div className="glass-card rounded-[18px] rounded-bl-[4px] px-5 py-4">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-2 h-2 rounded-full bg-emerald-400/70"
              style={{
                animation: 'typing-dot 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
