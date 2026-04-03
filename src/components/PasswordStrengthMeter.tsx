'use client'

export function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: 'Weak' }
  if (score <= 2) return { score: 2, label: 'Fair' }
  if (score <= 3) return { score: 3, label: 'Good' }
  return { score: 4, label: 'Strong' }
}

const colors: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-emerald-400',
  4: 'bg-emerald-500',
}

const textColors: Record<number, string> = {
  1: 'text-red-400',
  2: 'text-amber-400',
  3: 'text-emerald-400',
  4: 'text-emerald-500',
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label } = getPasswordStrength(password)
  if (!password) return null

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i <= score ? colors[score] : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <p className={`text-[10px] font-medium ${textColors[score]}`}>{label}</p>
    </div>
  )
}
