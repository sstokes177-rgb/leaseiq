import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Use placeholder values at build time so SSR doesn't crash during static generation.
// The app will show a config error at runtime if these are not set.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-key'

function isValidUrl(value: string | undefined): boolean {
  try {
    if (!value) return false
    new URL(value)
    return true
  } catch {
    return false
  }
}

const supabaseUrl = isValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  ? process.env.NEXT_PUBLIC_SUPABASE_URL!
  : PLACEHOLDER_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_KEY

// Browser client — for use in Client Components
export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Server client — for use in Server Components and Route Handlers
export async function createServerSupabaseClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component — cookies can't be set, safe to ignore
        }
      },
    },
  })
}

// Admin client — bypasses RLS, for server-side processing only
export function createAdminSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
