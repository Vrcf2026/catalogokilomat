/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as quoteRequestAdmin } from './quote-request-admin.tsx'
import { template as quoteRequestCustomer } from './quote-request-customer.tsx'
import { template as suggestionAdmin } from './suggestion-admin.tsx'
import { template as suggestionCustomer } from './suggestion-customer.tsx'
import { template as contactAdmin } from './contact-admin.tsx'
import { template as contactCustomer } from './contact-customer.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'quote-request-admin': quoteRequestAdmin,
  'quote-request-customer': quoteRequestCustomer,
  'suggestion-admin': suggestionAdmin,
  'suggestion-customer': suggestionCustomer,
  'contact-admin': contactAdmin,
  'contact-customer': contactCustomer,
}
