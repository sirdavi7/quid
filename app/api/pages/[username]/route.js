import { NextResponse } from 'next/server'
import { getPage, updatePageForOwner } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(_request, { params }) {
  const page = await getPage(params.username)

  if (!page) {
    return NextResponse.json({ error: 'Page not found.' }, { status: 404 })
  }

  return NextResponse.json({
    page: {
      name: page.name,
      username: page.username,
      headline: page.headline,
      note: page.note,
      walletAddress: page.walletAddress,
      walletBlockchain: page.walletBlockchain,
      walletMocked: page.walletMocked,
      createdAt: page.createdAt
    }
  })
}

export async function PATCH(request, { params }) {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      return NextResponse.json({ error: 'Sign in to edit this Quid page.' }, { status: 401 })
    }

    const body = await request.json()
    const page = await updatePageForOwner(data.user.id, params.username, {
      name: body.name,
      headline: body.headline,
      note: body.note
    })

    return NextResponse.json({ page })
  } catch (error) {
    return NextResponse.json({ error: error.message ?? 'Unable to update page.' }, { status: 500 })
  }
}
