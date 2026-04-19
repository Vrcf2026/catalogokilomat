import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  message?: string
}

const SuggestionCustomerEmail = ({ name = '', message = '' }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Sugestão recebida - VRCF</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Sugestão Recebida</Heading>
        <Text style={text}>Olá {name || 'cliente'},</Text>
        <Text style={text}>
          Agradecemos a sua sugestão! A sua opinião é muito importante para nós.
        </Text>
        <Text style={text}><strong>A sua mensagem:</strong></Text>
        <Text style={messageBox}>{message}</Text>
        <Hr style={hr} />
        <Text style={footer}>VRCF - VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</Text>
        <Text style={footer}>📞 +351 911 564 243 · ✉️ geral@vrcf.pt</Text>
        <Text style={footer}>📍 Rua Luis Calado Nunes 15 LJB, 2870-350 Montijo</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SuggestionCustomerEmail,
  subject: 'Sugestão recebida - VRCF',
  displayName: 'Sugestão (cliente)',
  previewData: {
    name: 'Maria Silva',
    message: 'Adicionar mais filtros na pesquisa.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #ff6b00', paddingBottom: '10px', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 8px' }
const messageBox = { fontSize: '14px', color: '#333', background: '#f7f7f9', padding: '14px', borderRadius: '6px', whiteSpace: 'pre-wrap' as const, margin: '0' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#666', margin: '0 0 4px' }
