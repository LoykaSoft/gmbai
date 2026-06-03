import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), supabase: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), supabase: null }
  }

  return { error: null, supabase }
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('firm_id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  if (!body.email || !body.password) {
    return NextResponse.json({ error: 'email ve password zorunlu' }, { status: 400 })
  }

  const service = getServiceClient()

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { error: profileError } = await service
    .from('profiles')
    .update({ firm_id: id, full_name: body.full_name ?? body.email, role: 'firm_user' })
    .eq('id', authData.user.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ id: authData.user.id, email: body.email }, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params
  const { error } = await requireAdmin()
  if (error) return error

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId zorunlu' }, { status: 400 })

  const service = getServiceClient()
  const { error: authError } = await service.auth.admin.deleteUser(userId)

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
