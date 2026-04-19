import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email?: string
  message?: string
}

const SuggestionAdminEmail = ({ name = '', email = '', message = '' }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Nova sugestão de {name}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>💡 Nova Sugestão</Heading>
        <Text style={text}><strong>Nome:</strong> {name}</Text>
        <Text style={text}><strong>Email:</strong> {email}</Text>
        <Heading as="h2" style={h2}>Mensagem</Heading>
        <Text style={messageBox}>{message}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Email gerado automaticamente pelo catálogo online VRCF.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SuggestionAdminEmail,
  subject: (d: Record<string, any>) =>
    `Nova Sugestão - ${(d?.name || 'Visitante').toString().slice(0, 80)}`,
  displayName: 'Sugestão (admin)',
  to: 'geral@vrcf.pt',
  previewData: {
    name: 'Maria Silva',
    email: 'maria@example.com',
    message: 'Adicionar mais filtros na pesquisa.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #ff6b00', paddingBottom: '10px', margin: '0 0 20px' }
const h2 = { fontSize: '18px', color: '#1a1a2e', margin: '20px 0 12px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 8px' }
const messageBox = { fontSize: '14px', color: '#333', background: '#f7f7f9', padding: '14px', borderRadius: '6px', whiteSpace: 'pre-wrap' as const, margin: '0' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
