// =============================================================================
// INVOICE ACTIONS — components/invoices/InvoiceActions.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The buttons for one invoice's PDF, shown right after creating it and
//   when tapping an invoice in the list:
//     - Share     the phone's share sheet with the PDF attached (Messages,
//                 Mail, AirDrop, Files, Print...)
//     - Print     print dialog on a computer; on a phone, the share sheet
//                 (where Print / AirPrint lives)
//     - Email     sends it to the customer's email address from
//                 noreply@schrammscape.com (copy to schrammscape@gmail.com)
//     - Download  saves the PDF
//
//   The PDF is fetched as soon as this panel opens, so tapping Share opens
//   the sheet immediately (iPhones only allow sharing straight from a tap).
//
// DEPENDS ON:
//   app/api/invoices/pdf (PDF of a saved invoice), app/api/invoices/email
// USED BY:
//   components/invoices/InvoiceForm.tsx, components/invoices/InvoiceList.tsx
// =============================================================================

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

async function accessToken() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has expired — please sign in again.')
  return token
}

function base64ToBlob(b64: string) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: 'application/pdf' })
}

const isPhoneOrTablet = () =>
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))

export default function InvoiceActions({
  invoiceId,
  number,
  customerName,
  pdfBase64,
  defaultEmail,
}: {
  invoiceId: string
  number: string
  customerName: string
  /** The PDF, when it's already in hand (right after creating); otherwise it's fetched. */
  pdfBase64?: string
  /** Customer's email; if not given, looked up from the customer list by name. */
  defaultEmail?: string
}) {
  const [pdf, setPdf] = useState<Blob | null>(() => (pdfBase64 ? base64ToBlob(pdfBase64) : null))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const fileName = `${number}.pdf`

  // Fetch the PDF up front (see the note at the top).
  useEffect(() => {
    if (pdf) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/invoices/pdf?id=${encodeURIComponent(invoiceId)}`, {
          headers: { Authorization: `Bearer ${await accessToken()}` },
        })
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Could not load the PDF.')
        const blob = await res.blob()
        if (!cancelled) setPdf(blob)
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load the PDF.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [invoiceId, pdf])

  // Fill in the customer's email from the customer list when we weren't given one.
  useEffect(() => {
    if (defaultEmail !== undefined || !customerName) return
    supabase
      .from('customers')
      .select('email')
      .eq('name', customerName)
      .is('deleted_at', null)
      .neq('email', '')
      .limit(1)
      .then(({ data }) => {
        const found = data?.[0]?.email as string | undefined
        if (found) setEmail((current) => current || found)
      })
  }, [customerName, defaultEmail])

  const download = () => {
    if (!pdf) return
    const url = URL.createObjectURL(pdf)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const share = async () => {
    if (!pdf) return
    setMessage(null)
    const file = new File([pdf], fileName, { type: 'application/pdf' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Invoice ${number}`, text: `Invoice ${number} from SchrammScape Lawncare` })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setMessage({ ok: false, text: 'Sharing failed. Try Download instead.' })
      }
    } else {
      download()
      setMessage({ ok: true, text: "This browser can't open a share sheet, so the PDF was downloaded instead." })
    }
  }

  const print = () => {
    if (!pdf) return
    if (isPhoneOrTablet()) return share() // the share sheet has Print / AirPrint
    const url = URL.createObjectURL(pdf)
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.src = url
    frame.onload = () => {
      try {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
      } catch {
        window.open(url, '_blank') // fall back to the browser's PDF viewer
      }
      setTimeout(() => {
        frame.remove()
        URL.revokeObjectURL(url)
      }, 60000)
    }
    document.body.appendChild(frame)
  }

  const sendEmail = async () => {
    const to = email.trim()
    if (!window.confirm(`Email invoice ${number} to ${to}?`)) return
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/invoices/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({ id: invoiceId, to }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'The email could not be sent.')
      setMessage({ ok: true, text: `Emailed to ${to} (copy to schrammscape@gmail.com).` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'The email could not be sent.' })
    } finally {
      setSending(false)
    }
  }

  const button = 'flex-1 rounded-md border py-2 text-sm font-medium disabled:opacity-40'
  const ready = !!pdf

  return (
    <div className="flex flex-col gap-3">
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {!ready && !loadError && <p className="text-xs text-gray-500">Preparing PDF…</p>}
      <div className="flex gap-2">
        <button onClick={share} disabled={!ready} className={`${button} text-white border-transparent`} style={{ backgroundColor: 'var(--hunter)' }}>
          Share
        </button>
        <button onClick={print} disabled={!ready} className={button} style={{ color: 'var(--hunter)' }}>
          Print
        </button>
        <button onClick={download} disabled={!ready} className={button} style={{ color: 'var(--hunter)' }}>
          Download
        </button>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          sendEmail()
        }}
      >
        <input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Customer email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-0 rounded-md border px-3 py-2 text-base bg-white"
        />
        <button
          type="submit"
          disabled={sending || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
          className="shrink-0 rounded-md border px-3 text-sm font-medium disabled:opacity-40"
          style={{ color: 'var(--hunter)' }}
        >
          {sending ? 'Sending…' : 'Email'}
        </button>
      </form>
      {message && <p className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
    </div>
  )
}
