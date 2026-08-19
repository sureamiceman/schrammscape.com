// =============================================================================
// TAB MENU — components/TabMenu.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   Renders the three-tab panel on the homepage: "Contact", "History", and
//   "Request Info". Clicking a tab header switches which content is shown
//   below it. Contains two logical parts:
//     1. TabMenu (the main component) — the tab headers + Contact/History
//        panels, which display information passed in from app/page.tsx.
//     2. RequestForm (a sub-component used only by the "Request Info" tab)
//        — the actual name/email/phone/message form.
//
// DEPENDS ON:
//   - contactInfo, historyContent, onRequestInfo, and onTabChange are all
//     passed in by app/page.tsx — this file does not contain the actual
//     phone number, email, or bio text itself, only how they're displayed.
//   - The .tab-button CSS class in app/globals.css, which styles the tab
//     headers (including the underline shown on the active tab).
//
// USED BY / DEPENDED ON BY:
//   - app/page.tsx renders this TWICE (desktop layout and mobile layout),
//     passing it CONTACT_INFO and HISTORY_CONTENT each time.
//   - app/page.tsx's handleTabChange function is called every time the
//     visitor switches tabs, which is how the photo carousel knows to swap
//     in Tyler's bio photos when the "History" tab is opened.
//
// HOW THE REQUEST FORM DELIVERS SUBMISSIONS:
//   The "Request Info" form (RequestForm below) sends whatever the visitor
//   typed to app/api/contact/route.ts, a server endpoint that emails the
//   details to schrammscape@gmail.com (subject: "NEW Contact form from
//   schrammscape.com!!") using the Resend email service. See the SETUP
//   NOTES at the top of that file for the one-time setup this requires
//   (a Resend API key). Only after the email successfully sends does this
//   form show the "Thank you" popup (see handleRequestInfo in app/page.tsx)
//   — if sending fails, the visitor sees an error message instead so they
//   know to try again or call/email directly.
// =============================================================================

'use client'

import { useState } from 'react'

// -----------------------------------------------------------------------
// TabMenuProps — what this component needs to be given by its parent
// (app/page.tsx) in order to work.
// -----------------------------------------------------------------------
// contactInfo    — phone, email, service area text, and social media links
//                  to display on the "Contact" tab.
// historyContent — the bio/story text to display on the "History" tab.
// onRequestInfo  — a function to call after the request form is submitted
//                  (currently just shows a confirmation popup).
// onTabChange    — an optional function to call whenever the visitor
//                  switches tabs, so the parent page can react (e.g. swap
//                  which photos are shown in the carousel).
// -----------------------------------------------------------------------
export interface TabMenuProps {
  contactInfo: {
    phone: string
    email: string
    location: string
    socials?: Array<{ name: string; url: string }>
  }
  historyContent: string
  onRequestInfo: () => void
  onTabChange?: (tab: 'contact' | 'history' | 'request') => void
}

export default function TabMenu({
  contactInfo,
  historyContent,
  onRequestInfo,
  onTabChange,
}: TabMenuProps) {
  // Tracks which of the three tabs is currently open. Starts on "Contact".
  const [activeTab, setActiveTab] = useState<'contact' | 'history' | 'request'>('contact')

  // Switches the visible tab, and lets the parent page (app/page.tsx) know
  // about the change via onTabChange, if it provided one.
  const handleTabClick = (tab: 'contact' | 'history' | 'request') => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* ================================================================
          TAB HEADERS — the three clickable buttons across the top:
          Contact | History | Request Info. The currently active one is
          underlined and colored (see the .tab-button.active style in
          app/globals.css).
      ================================================================= */}
      <div className="flex border-b flex-shrink-0">
        <button
          onClick={() => handleTabClick('contact')}
          className={`tab-button flex-1 text-center py-3 ${
            activeTab === 'contact' ? 'active' : ''
          }`}
        >
          Contact
        </button>
        <button
          onClick={() => handleTabClick('history')}
          className={`tab-button flex-1 text-center py-3 ${
            activeTab === 'history' ? 'active' : ''
          }`}
        >
          History
        </button>
        <button
          onClick={() => handleTabClick('request')}
          className={`tab-button flex-1 text-center py-3 ${
            activeTab === 'request' ? 'active' : ''
          }`}
        >
          Request Info
        </button>
      </div>

      {/* ================================================================
          TAB CONTENT — only one of the three sections below is visible
          at a time, depending on which tab is active.
      ================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* ---- CONTACT TAB: phone, email, service area, socials ---- */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--hunter)' }}>Get in Touch</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <a
                    href={`tel:${contactInfo.phone}`}
                    className="text-lg font-medium hover:underline"
                    style={{ color: 'var(--hunter)' }}
                  >
                    {contactInfo.phone}
                  </a>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="text-lg font-medium hover:underline"
                    style={{ color: 'var(--hunter)' }}
                  >
                    {contactInfo.email}
                  </a>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Service Area</p>
                  <p className="text-base font-medium" style={{ color: 'var(--hunter)' }}>
                    {contactInfo.location}
                  </p>
                </div>
              </div>

              {/* Social media links — only rendered if at least one was
                  provided in CONTACT_INFO.socials (app/page.tsx). */}
              {contactInfo.socials && contactInfo.socials.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-3">Follow</p>
                  <div className="flex gap-4">
                    {contactInfo.socials.map((social) => (
                      <a
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:underline"
                        style={{ color: 'var(--hunter)' }}
                      >
                        {social.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- HISTORY TAB: Tyler's "Our Story" bio text ---- */}
        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--hunter)' }}>Our Story</h3>
            <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
              {/* historyContent (from app/page.tsx) is one long block of
                  text with blank lines between paragraphs. This splits it
                  on line breaks and renders each non-empty line as its own
                  paragraph, so editors don't need to add any HTML — just
                  plain text with blank lines. */}
              {historyContent.split('\n').map((paragraph, idx) => (
                paragraph.trim() && <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {/* ---- REQUEST INFO TAB: the contact request form ---- */}
        {activeTab === 'request' && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--hunter)' }}>Request Information</h3>
            <RequestForm onSubmit={onRequestInfo} />
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// REQUEST FORM — a sub-component used only inside the "Request Info" tab
// =============================================================================
// WHAT IT DOES:
//   A simple form collecting Name, Email, Phone, and a Message. On submit,
//   it sends that info to app/api/contact/route.ts (a server endpoint that
//   emails it to schrammscape@gmail.com via Resend). While the email is
//   being sent, the submit button shows "Sending..." and is disabled so the
//   visitor can't double-submit. If it succeeds, it calls the onSubmit
//   function it was given (which shows a "Thank you" popup — see
//   handleRequestInfo in app/page.tsx) and clears the form. If it fails
//   (e.g. the email service is down or misconfigured), an error message is
//   shown instead so the visitor knows to try again or reach out directly.
// =============================================================================
interface RequestFormProps {
  onSubmit: () => void
}

function RequestForm({ onSubmit }: RequestFormProps) {
  // Holds whatever the visitor has typed into each form field so far.
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })

  // True while the email is being sent to the server, used to disable the
  // submit button and show a "Sending..." label so visitors don't click
  // it multiple times.
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Holds a user-facing error message if the last submit attempt failed
  // (e.g. network issue, or the email service rejected the request).
  // Empty string means "no error currently shown".
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      // Sends the form data to app/api/contact/route.ts, which emails it
      // to schrammscape@gmail.com.
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to send request')
      }

      onSubmit()
      setFormData({ name: '', email: '', phone: '', message: '' })
    } catch (err) {
      setErrorMessage(
        "Sorry, something went wrong sending your request. Please try again, or reach out by phone/email directly."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error message — only shown after a failed submit attempt. */}
      {errorMessage && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errorMessage}
        </div>
      )}

      {/* Name field (required) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-transparent outline-none"
          style={{ '--tw-ring-color': 'var(--hunter)' } as any}
        />
      </div>

      {/* Email field (required) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-transparent outline-none"
          style={{ '--tw-ring-color': 'var(--hunter)' } as any}
        />
      </div>

      {/* Phone field (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-transparent outline-none"
          style={{ '--tw-ring-color': 'var(--hunter)' } as any}
        />
      </div>

      {/* Message field (optional, multi-line) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-grass focus:border-transparent outline-none resize-none"
        />
      </div>

      {/* Submit button — darkens on hover for a subtle interactive effect.
          Disabled and relabeled "Sending..." while the request is in
          flight, to prevent double-submitting. */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full text-white font-medium py-2 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--hunter)' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hunter-dark)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--hunter)'}
      >
        {isSubmitting ? 'Sending...' : 'Send Request'}
      </button>
    </form>
  )
}
