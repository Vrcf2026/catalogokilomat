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
  customerEmail?: string
  customerPhone?: string
  notes?: string
  items?: QuoteItem[]
}

const formatPrice = (p?: number | null) =>
  p != null ? `${Number(p).toFixed(2).replace('.', ',')} €` : 'Sob consulta'

const QuoteRequestAdminEmail = ({
  customerName = '',
  customerEmail = '',
  customerPhone = '',
  notes = '',
  items = [],
}: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Novo pedido de orçamento de {customerName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>📋 Novo Pedido de Orçamento</Heading>
        <Text style={text}><strong>Cliente:</strong> {customerName}</Text>
        <Text style={text}><strong>Email:</strong> {customerEmail}</Text>
        <Text style={text}><strong>Telefone:</strong> {customerPhone}</Text>
        {notes ? <Text style={text}><strong>Observações:</strong> {notes}</Text> : null}
        <Hr style={hr} />
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
        <Hr style={hr} />
        <Text style={footer}>
          Email gerado automaticamente pelo catálogo online VRCF.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: QuoteRequestAdminEmail,
  subject: (d: Record<string, any>) =>
    `Novo Pedido de Orçamento - ${(d?.customerName || 'Cliente').toString().slice(0, 80)}`,
  displayName: 'Pedido de orçamento (admin)',
  to: 'geral@vrcf.pt',
  previewData: {
    customerName: 'João Silva',
    customerEmail: 'joao@example.com',
    customerPhone: '+351 911 000 000',
    notes: 'Preciso para projeto novo.',
    items: [
      { name: 'Câmara IP', category: 'Segurança', quantity: 2, price: 89.9 },
      { name: 'Switch 8 portas', category: 'Redes', quantity: 1, price: null },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #ff6b00', paddingBottom: '10px', margin: '0 0 20px' }
const h2 = { fontSize: '18px', color: '#1a1a2e', margin: '20px 0 12px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 8px' }
const itemRow = { background: '#f7f7f9', padding: '10px 14px', borderRadius: '6px', margin: '0 0 8px' }
const itemText = { fontSize: '14px', color: '#1a1a2e', margin: '0' }
const itemMeta = { fontSize: '12px', color: '#666', margin: '4px 0 0' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
