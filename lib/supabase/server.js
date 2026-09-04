import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase server env vars are required.')
  }

  const cookieStore = cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options })
          })
        } catch {
          // Server Components cannot set cookies. Route handlers can.
        }
      }
    }
  })
}
