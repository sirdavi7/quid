import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSafeNextPath } from '@/lib/routes'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = getSafeNextPath(requestUrl.searchParams.get('next'))

  if (code) {
    const supabase = createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
