import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  issues?: string[]
  failedLast24h?: number
  dlqCount?: number
  pendingCount?: number
  lastSentAt?: string | null
  adminUrl?: string
}

const EmailHealthAlertEmail = ({
  issues = [],
  failedLast24h = 0,
  dlqCount = 0,
  pendingCount = 0,
  lastSentAt = null,
  adminUrl = 'https://showroom.kilomat.pt/admin',
}: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Alerta: sistema de emails Kilomat com problemas</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Alerta — Sistema de Emails</Heading>
        <Text style={text}>
          A verificação automática detetou problemas no envio de emails do catálogo Kilomat.
        </Text>

        <Heading as="h2" style={h2}>Problemas detetados</Heading>
        {issues.length > 0 ? (
          issues.map((issue, i) => (
            <Text key={i} style={issueText}>• {issue}</Text>
          ))
        ) : (
          <Text style={text}>Sem detalhes específicos.</Text>
        )}

        <Heading as="h2" style={h2}>Resumo (últimas 24h)</Heading>
        <Text style={text}><strong>Falhados:</strong> {failedLast24h}</Text>
        <Text style={text}><strong>Em DLQ (desistidos):</strong> {dlqCount}</Text>
        <Text style={text}><strong>Pendentes na fila:</strong> {pendingCount}</Text>
        <Text style={text}>
          <strong>Último envio com sucesso:</strong>{' '}
          {lastSentAt ? new Date(lastSentAt).toLocaleString('pt-PT') : 'Nenhum nas últimas 24h'}
        </Text>

        <Hr style={hr} />
        <Text style={text}>
          Ver detalhes em: <Link href={adminUrl} style={link}>{adminUrl}</Link>
        </Text>
        <Text style={footer}>
          Verificação automática do catálogo Kilomat. Se não receberes este email, significa que está tudo OK.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EmailHealthAlertEmail,
  subject: (d: Record<string, any>) =>
    `[Kilomat] Alerta envio de emails (${d?.failedLast24h ?? 0} falhas / ${d?.dlqCount ?? 0} DLQ)`,
  displayName: 'Alerta saúde de emails (admin)',
  to: 'geral@vrcf.pt',
  previewData: {
    issues: ['3 envios falhados nas últimas 24h', '2 emails parados em DLQ'],
    failedLast24h: 3,
    dlqCount: 2,
    pendingCount: 5,
    lastSentAt: new Date().toISOString(),
    adminUrl: 'https://showroom.kilomat.pt/admin',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #dc2626', paddingBottom: '10px', margin: '0 0 20px' }
const h2 = { fontSize: '16px', color: '#1a1a2e', margin: '24px 0 10px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 6px' }
const issueText = { fontSize: '14px', color: '#b91c1c', lineHeight: '1.5', margin: '0 0 4px' }
const link = { color: '#0f766e', textDecoration: 'underline' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '16px 0 0' }