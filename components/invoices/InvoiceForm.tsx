// =============================================================================
// NEW INVOICE FORM — components/invoices/InvoiceForm.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The right-hand panel's "Create New Invoice" form: customer info, a
//   repeatable list of line items, and notes. On submit, it POSTs to
//   app/api/invoices/create, which saves the invoice, emails a PDF to
//   schrammscape@gmail.com, and hands the PDF back here so it can also
//   be downloaded immediately.
//
// DEPENDS ON:
//   - lib/supabaseClient.ts, to grab the current access token to send
//     along with the request (so the server can act as the signed-in
//     user, respecting Row Level Security).
//
// USED BY:
//   - components/invoices/InvoiceApp.tsx, swapped in when "Create New
//     Invoice" is clicked.
// =============================================================================

'use client'

import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface LineInput {
  date: string
  details: string
  amount: string
}

const emptyLine = (): LineInput => ({ date: '', details: '', amount: '' })

function todayForInput() {
  return new Date().toISOString().slice(0, 10)
}

export default function InvoiceForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void
  onCreated: () => void
}) {
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [issueDate, setIssueDate] = useState(todayForInput)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineInput[]>([emptyLine()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ number: string; pdfBase64: string } | null>(null)

  const updateLine = (index: number, patch: Partial<LineInput>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }
  const addLine = () => setLines((prev) => [...prev, emptyLine()])
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index))

  // Only lines with both a description and a positive amount count —
  // matches what the server will actually accept.
  const validLines = lines.filter((l) => l.details.trim() && Number(l.amount) > 0)
  const total = validLines.reduce((sum, l) => sum + Number(l.amount), 0)
  const canSubmit = customerName.trim().length > 0 && validLines.length > 0 && !submitting

  const resetForm = () => {
    setCustomerName('')
    setCustomerAddress('')
    setIssueDate(todayForInput())
    setNotes('')
    setLines([emptyLine()])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Your session has expired — please sign in again.')

      const res = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName,
          customerAddress,
          issueDate: new Date(issueDate).toISOString(),
          notes,
          lines: validLines.map((l) => ({
            date: l.date ? new Date(l.date).toISOString() : null,
            details: l.details,
            amount: Number(l.amount),
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Something went wrong creating the invoice.')
      setResult({ number: json.number, pdfBase64: json.pdfBase64 })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const downloadPdf = () => {
    if (!result) return
    const byteChars = atob(result.pdfBase64)
    const byteNumbers = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.number}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Confirmation state, shown after a successful create.
  if (result) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-12 text-center">
        <p className="text-lg font-semibold text-gray-800">Invoice {result.number} created</p>
        <p className="text-sm text-gray-500">Emailed to schrammscape@gmail.com.</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={downloadPdf}
            className="px-4 py-2 rounded-md text-white text-sm font-medium"
            style={{ backgroundColor: 'var(--hunter)' }}
          >
            Download PDF
          </button>
          <button
            onClick={() => {
              setResult(null)
              resetForm()
              onCancel()
            }}
            className="px-4 py-2 rounded-md border text-sm text-gray-600"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">New Invoice</h2>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-700">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm text-gray-600">
          Customer name *
          <input
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          Customer address
          <input
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          Invoice date
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Line items *</p>
        <div className="flex flex-col gap-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                type="date"
                value={line.date}
                onChange={(e) => updateLine(i, { date: e.target.value })}
                className="border rounded-md px-2 py-2 text-sm w-36"
              />
              <input
                placeholder="Description"
                value={line.details}
                onChange={(e) => updateLine(i, { details: e.target.value })}
                className="border rounded-md px-2 py-2 text-sm flex-1"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="$0.00"
                value={line.amount}
                onChange={(e) => updateLine(i, { amount: e.target.value })}
                className="border rounded-md px-2 py-2 text-sm w-24 text-right"
              />
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="text-gray-400 hover:text-red-600 px-1"
                  aria-label="Remove line"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="text-sm mt-2 hover:underline"
          style={{ color: 'var(--hunter)' }}
        >
          + Add line
        </button>
      </div>

      <label className="text-sm text-gray-600">
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
        />
      </label>

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm text-gray-500">Total</span>
        <span className="font-semibold text-gray-800">
          {total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md text-white font-medium py-2.5 disabled:opacity-50"
        style={{ backgroundColor: 'var(--hunter)' }}
      >
        {submitting ? 'Generating…' : 'Generate Invoice (PDF + Email)'}
      </button>
    </form>
  )
}
