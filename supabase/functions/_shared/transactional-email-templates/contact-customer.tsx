import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  message?: string
}

const ContactCustomerEmail = ({ name = '', message = '' }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Recebemos o seu contacto - Kilomat</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Mensagem Recebida</Heading>
        <Text style={text}>Olá {name || 'cliente'},</Text>
        <Text style={text}>
          Obrigado pelo seu contacto! Temos tudo o que precisa para a sua obra ou renovação.
          A nossa equipa irá responder-lhe brevemente.
        </Text>
        <Text style={text}><strong>A sua mensagem:</strong></Text>
        <Text style={messageBox}>{message}</Text>
        <Hr style={hr} />
        <Text style={footer}>Kilomat - Materiais para Construção, Lda.</Text>
        <Text style={footer}>📞 +351 938 283 386 · ✉️ kilomat@gmail.com</Text>
        <Text style={footer}>📍 Estr. do Pau Queimado, Zona Industrial Pau Queimado, 2870-100 Montijo</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactCustomerEmail,
  subject: 'Recebemos o seu contacto - Kilomat',
  displayName: 'Contacto (cliente)',
  previewData: {
    name: 'João Pereira',
    message: 'Procuro telhas cerâmicas para uma obra em Setúbal.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #ff6b00', paddingBottom: '10px', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 8px' }
const messageBox = { fontSize: '14px', color: '#333', background: '#f7f7f9', padding: '14px', borderRadius: '6px', whiteSpace: 'pre-wrap' as const, margin: '0' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#666', margin: '0 0 4px' }
