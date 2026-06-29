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
  const supabase = createClient(supabaseUrl, serviceKey)

  // Optional ?force=1 to send alert even if healthy (for testing)
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Deduplicate by message_id (latest status per email)
  const { data: recent } = await supabase
    .from('email_send_log')
    .select('message_id, status, error_message, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  const latestByMsg = new Map<string, { status: string; error_message: string | null; created_at: string }>()
  for (const row of recent ?? []) {
    if (!row.message_id) continue
    if (!latestByMsg.has(row.message_id)) {
      latestByMsg.set(row.message_id, {
        status: row.status,
        error_message: row.error_message,
        created_at: row.created_at,
      })
    }
  }

  let sent24h = 0, failed24h = 0, dlq24h = 0, suppressed24h = 0
  let lastSentAt: string | null = null
  const sampleErrors: string[] = []
  for (const v of latestByMsg.values()) {
    if (v.status === 'sent') {
      sent24h++
      if (!lastSentAt || v.created_at > lastSentAt) lastSentAt = v.created_at
    } else if (v.status === 'dlq') {
      dlq24h++
      if (v.error_message && sampleErrors.length < 3) sampleErrors.push(v.error_message.slice(0, 120))
    } else if (v.status === 'failed') {
      failed24h++
    } else if (v.status === 'suppressed') {
      suppressed24h++
    }
  }

  // Queue depth (pending in pgmq)
  let pendingCount = 0
  try {
    const { data: q } = await supabase.rpc('read_email_batch', {
      queue_name: 'transactional_emails',
      batch_size: 1,
      vt: 1,
    })
    // We don't truly want to claim — fallback: count pending rows in log
    if (Array.isArray(q)) pendingCount = q.length
  } catch { /* ignore */ }

  const { count: pendingLogged } = await supabase
    .from('email_send_log')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .gte('created_at', since)
  pendingCount = pendingLogged ?? pendingCount

  // Issue detection
  const issues: string[] = []
  if (dlq24h > 0) issues.push(`${dlq24h} email(s) parado(s) em DLQ (desistiu após várias tentativas).`)
  if (failed24h >= 3) issues.push(`${failed24h} envios falhados nas últimas 24h.`)
  if (sampleErrors.some((e) => /domain_not_verified|403|drift|not.*verified/i.test(e))) {
    issues.push('Detetado erro de domínio (domain_not_verified ou 403). Verifica DNS em Cloud → Emails.')
  }
  if (pendingCount > 20) issues.push(`Fila acumulada com ${pendingCount} emails pendentes.`)

  const healthy = issues.length === 0
  const result = {
    healthy,
    sent24h,
    failed24h,
    dlq24h,
    suppressed24h,
    pendingCount,
    lastSentAt,
    issues,
    sampleErrors,
    checkedAt: new Date().toISOString(),
  }

  if (!healthy || force) {
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'email-health-alert',
          recipientEmail: 'geral@vrcf.pt',
          idempotencyKey: `health-${new Date().toISOString().slice(0, 13)}`, // 1 per hour max
          templateData: {
            issues: issues.length ? issues : ['(Teste forçado — sistema saudável)'],
            failedLast24h: failed24h,
            dlqCount: dlq24h,
            pendingCount,
            lastSentAt,
            adminUrl: 'https://showroom.kilomat.pt/admin',
          },
        },
      })
    } catch (e) {
      console.error('Failed to send health alert', e)
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})