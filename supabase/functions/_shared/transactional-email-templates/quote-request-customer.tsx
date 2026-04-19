import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface QuoteItem {
  name: string
  category?: string
  quantity: number
  price?: number | null
}

interface Props {
  customerName?: string
  notes?: string
  items?: QuoteItem[]
}

const formatPrice = (p?: number | null) =>
  p != null ? `${Number(p).toFixed(2).replace('.', ',')} €` : 'Sob consulta'

const QuoteRequestCustomerEmail = ({
  customerName = '',
  notes = '',
  items = [],
}: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Cópia do seu pedido de orçamento - VRCF</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>📋 Cópia do Seu Pedido de Orçamento</Heading>
        <Text style={text}>Olá {customerName || 'cliente'},</Text>
        <Text style={text}>
          Recebemos o seu pedido de orçamento. Entraremos em contacto brevemente.
        </Text>
        <Heading as="h2" style={h2}>Produtos Solicitados</Heading>
        <Section>
          {items.map((item, idx) => (
            <Section key={idx} style={itemRow}>
              <Text style={itemText}>
                <strong>{item.name}</strong>
                {item.category ? ` — ${item.category}` : ''}
              </Text>
              <Text style={itemMeta}>
                Quantidade: {item.quantity} · Preço unit.: {formatPrice(item.price)}
              </Text>
            </Section>
          ))}
        </Section>
        {notes ? (
          <>
            <Heading as="h3" style={h3}>Observações</Heading>
            <Text style={text}>{notes}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>VRCF - VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</Text>
        <Text style={footer}>📞 +351 911 564 243 · ✉️ geral@vrcf.pt</Text>
        <Text style={footer}>📍 Rua Luis Calado Nunes 15 LJB, 2870-350 Montijo</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: QuoteRequestCustomerEmail,
  subject: 'Cópia do seu pedido de orçamento - VRCF',
  displayName: 'Pedido de orçamento (cliente)',
  previewData: {
    customerName: 'João Silva',
    notes: 'Preciso para projeto novo.',
    items: [
      { name: 'Câmara IP', category: 'Segurança', quantity: 2, price: 89.9 },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #ff6b00', paddingBottom: '10px', margin: '0 0 20px' }
const h2 = { fontSize: '18px', color: '#1a1a2e', margin: '20px 0 12px' }
const h3 = { fontSize: '15px', color: '#1a1a2e', margin: '16px 0 8px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 8px' }
const itemRow = { background: '#f7f7f9', padding: '10px 14px', borderRadius: '6px', margin: '0 0 8px' }
const itemText = { fontSize: '14px', color: '#1a1a2e', margin: '0' }
const itemMeta = { fontSize: '12px', color: '#666', margin: '4px 0 0' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#666', margin: '0 0 4px' }
