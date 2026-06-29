import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Require authenticated admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: isAdmin } = await userClient.rpc('has_role', {
    _user_id: userData.user.id, _role: 'admin',
  })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows } = await supabase
    .from('email_send_log')
    .select('id, message_id, template_name, recipient_email, status, error_message, created_at')
    .gte('created_at', since7d)
    .order('created_at', { ascending: false })
    .limit(500)

  // Dedupe by message_id
  const latest = new Map<string, any>()
  for (const r of rows ?? []) {
    if (!r.message_id) continue
    if (!latest.has(r.message_id)) latest.set(r.message_id, r)
  }
  const dedup = Array.from(latest.values())

  const now = Date.now()
  const counts = (windowMs: number) => {
    const since = now - windowMs
    const items = dedup.filter((r) => new Date(r.created_at).getTime() >= since)
    return {
      total: items.length,
      sent: items.filter((r) => r.status === 'sent').length,
      failed: items.filter((r) => r.status === 'failed').length,
      dlq: items.filter((r) => r.status === 'dlq').length,
      suppressed: items.filter((r) => r.status === 'suppressed').length,
      pending: items.filter((r) => r.status === 'pending').length,
    }
  }

  const stats24h = counts(24 * 60 * 60 * 1000)
  const stats7d = counts(7 * 24 * 60 * 60 * 1000)

  const lastSent = dedup.find((r) => r.status === 'sent')?.created_at ?? null

  // Health verdict
  const issues: string[] = []
  if (stats24h.dlq > 0) issues.push(`${stats24h.dlq} email(s) em DLQ nas últimas 24h`)
  if (stats24h.failed >= 3) issues.push(`${stats24h.failed} falhas nas últimas 24h`)
  const lastSentAgeH = lastSent ? (now - new Date(lastSent).getTime()) / 3600000 : 999
  if (stats24h.pending > 5 && lastSentAgeH > 1) issues.push('Fila parada (pendentes sem envio na última hora)')

  const healthy = issues.length === 0

  return new Response(JSON.stringify({
    healthy,
    issues,
    stats24h,
    stats7d,
    lastSentAt: lastSent,
    recent: dedup.slice(0, 50),
    checkedAt: new Date().toISOString(),
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})