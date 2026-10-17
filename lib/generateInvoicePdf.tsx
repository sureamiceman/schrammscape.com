// =============================================================================
// INVOICE PDF RENDERER — lib/generateInvoicePdf.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   Renders a single invoice to a PDF Buffer, server-side. Layout mirrors
//   the iPhone app's InvoicePDFBuilder.swift and the printed paper
//   template, so an invoice looks the same no matter where it came from:
//   business name centered at the top, logo + contact info on the left,
//   "INVOICE" + number/date on the right, a BILL TO block, a line-item
//   table, a total, and a notes/footer block.
//
// DEPENDS ON:
//   - The "@react-pdf/renderer" npm package.
//   - lib/invoiceLogo.ts — the logo embedded as a base64 data URI (not
//     read from the filesystem, so this keeps working inside a Netlify
//     serverless function, which doesn't reliably expose the public/
//     folder at runtime).
//
// USED BY:
//   - app/api/invoices/create/route.ts, right after an invoice is saved.
// =============================================================================

import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { INVOICE_LOGO_DATA_URI } from './invoiceLogo'

export interface InvoicePdfLine {
  date: string | null
  details: string
  amount: number
}

export interface InvoicePdfData {
  number: string
  customerName: string
  customerAddress: string
  issueDate: string
  notes: string
  lines: InvoicePdfLine[]
}

// Same letterhead details as the printed template / app Invoice Settings.
const BUSINESS_NAME = 'SchrammScape Lawncare'
const BUSINESS_ADDRESS = '2425 Blackoak Drive, Troy, OH 45373'
const BUSINESS_PHONE = '(937) 602-1945'
const BUSINESS_EMAIL = 'schrammscape@gmail.com'

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  businessName: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  logo: { width: 46, height: 46, marginBottom: 6 },
  contactLine: { fontSize: 9, color: '#555555' },
  invoiceTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'right', marginBottom: 6 },
  invoiceMetaLabel: { fontSize: 9, fontWeight: 'bold', color: '#444444', textAlign: 'right', marginTop: 3 },
  billToLabel: { fontSize: 8, fontWeight: 'bold', color: '#888888', marginBottom: 4 },
  billToName: { fontSize: 12, fontWeight: 'bold' },
  billToAddress: { fontSize: 10, marginTop: 2 },
  table: { marginTop: 22 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#2F4F3E', paddingVertical: 6, paddingHorizontal: 4 },
  tableHeaderCell: { fontSize: 8, fontWeight: 'bold', color: '#FFFFFF' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#CCCCCC',
  },
  colDate: { width: 80 },
  colDesc: { flexGrow: 1 },
  colAmount: { width: 70, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalLabel: { fontSize: 12, fontWeight: 'bold', marginRight: 14 },
  totalAmount: { fontSize: 12, fontWeight: 'bold', width: 70, textAlign: 'right' },
  footer: { marginTop: 30 },
  notesLabel: { fontSize: 9, fontWeight: 'bold', marginBottom: 2 },
  notesText: { fontSize: 9, marginBottom: 12 },
  terms: { fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  thanks: { fontSize: 9, color: '#888888' },
})

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function InvoiceDocument({ invoice }: { invoice: InvoicePdfData }) {
  const total = invoice.lines.reduce((sum, l) => sum + (l.amount || 0), 0)
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.businessName}>{BUSINESS_NAME}</Text>

        <View style={styles.headerRow}>
          <View>
            <Image src={INVOICE_LOGO_DATA_URI} style={styles.logo} />
            <Text style={styles.contactLine}>{BUSINESS_ADDRESS}</Text>
            <Text style={styles.contactLine}>{BUSINESS_PHONE}</Text>
            <Text style={styles.contactLine}>{BUSINESS_EMAIL}</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMetaLabel}>Invoice #  {invoice.number}</Text>
            <Text style={styles.invoiceMetaLabel}>Date  {formatDate(invoice.issueDate)}</Text>
          </View>
        </View>

        <Text style={styles.billToLabel}>BILL TO</Text>
        <Text style={styles.billToName}>{invoice.customerName}</Text>
        {invoice.customerAddress ? <Text style={styles.billToAddress}>{invoice.customerAddress}</Text> : null}

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>DATE</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>DESCRIPTION</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>AMOUNT</Text>
          </View>
          {invoice.lines.map((line, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colDate}>{formatDate(line.date)}</Text>
              <Text style={styles.colDesc}>{line.details}</Text>
              <Text style={styles.colAmount}>{formatCurrency(line.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        </View>

        <View style={styles.footer}>
          {invoice.notes ? (
            <>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{invoice.notes}</Text>
            </>
          ) : null}
          <Text style={styles.terms}>Payment terms: Due on receipt</Text>
          <Text style={styles.thanks}>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePdfBuffer(invoice: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />)
}
