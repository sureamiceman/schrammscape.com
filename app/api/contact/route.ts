// =============================================================================
// CONTACT FORM EMAIL ENDPOINT — app/api/contact/route.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   This is a small "behind the scenes" server endpoint (not a visible
//   page) that the "Request Info" form on the homepage submits to. When a
//   visitor fills out the form and clicks "Send Request", their browser
//   sends the name/email/phone/message here, and this file emails those
//   details to schrammscape@gmail.com using the Resend email service.
//
//   Subject line sent: "NEW Contact form from schrammscape.com!!"
//
// DEPENDS ON:
//   - The "resend" npm package (installed via `npm install resend`), which
//     is the email-sending service used here.
//   - A RESEND_API_KEY environment variable — a secret password-like key
//     from resend.com that authorizes sending email through their service.
//     THIS FILE WILL NOT WORK until that key is set. See SETUP NOTES below.
//   - components/TabMenu.tsx's RequestForm, which sends the form data here.
//
// USED BY / DEPENDED ON BY:
//   - components/TabMenu.tsx calls this endpoint (at the web address
//     "/api/contact") when the visitor submits the Request Info form.
//   - Next.js automatically turns this file into a live server endpoint at
//     "/api/contact" because of its location (app/api/contact/route.ts)
//     and its file name ("route.ts") — nothing else needs to register it.
//
// -----------------------------------------------------------------------
// SETUP NOTES (one-time setup required before this works):
// -----------------------------------------------------------------------
//   1. Create a free account at https://resend.com and generate an API key.
//   2. Set that key as an environment variable named RESEND_API_KEY:
//        - For local testing: create a file named ".env.local" in the
//          project's root folder (same level as package.json) containing:
//              RESEND_API_KEY=your-key-here
//          (This file is intentionally left out of Git via .gitignore, so
//          the secret key never gets committed/published.)
//        - For the live site (hosted on Netlify): open the Netlify site
//          dashboard → Site configuration → Environment variables → add
//          RESEND_API_KEY with the same key. Netlify will need to redeploy
//          the site after this is added for it to take effect.
//   3. (Optional, later) By default this sends FROM Resend's shared test
//      address ("onboarding@resend.dev"), which works immediately with no
//      extra setup but looks less professional to the recipient. Once a
//      domain (e.g. schrammscape.com) is verified in the Resend dashboard,
//      change EMAIL_FROM below to something like
//      "SchrammScape Website <noreply@schrammscape.com>".
// =============================================================================

import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// The Gmail inbox that should receive every contact form submission.
const RECIPIENT_EMAIL = 'schrammscape@gmail.com'

// The exact subject line requested for every submission email.
const EMAIL_SUBJECT = 'NEW Contact form from schrammscape.com!!'

// The "from" address Resend sends as. Domain is now verified in Resend.
const EMAIL_FROM = 'SchrammScape Website <noreply@schrammscape.com>'
// -----------------------------------------------------------------------
// POST /api/contact
// -----------------------------------------------------------------------
// Called automatically by the Request Info form. Expects a JSON body of
// the shape: { name, email, phone, message }. Sends that info as an email
// and reports back whether it succeeded.
// -----------------------------------------------------------------------
export async function POST(request: Request) {
  // If the site owner hasn't set up their Resend API key yet, fail with a
  // clear error instead of crashing confusingly.
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set — see SETUP NOTES at the top of app/api/contact/route.ts')
    return NextResponse.json(
      { error: 'Email service is not configured yet.' },
      { status: 500 }
    )
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { name, email, phone, message } = await request.json()

    // Basic validation — name and email are required on the form itself,
    // but we double check here since this endpoint could be called
    // directly, not just from the form.
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required.' },
        { status: 400 }
      )
    }

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: RECIPIENT_EMAIL,
      subject: EMAIL_SUBJECT,
      // "reply_to" is set to the visitor's own email, so Tyler can just
      // hit "Reply" in Gmail to respond directly to them.
      replyTo: email,
      text: [
        `New request submitted from the schrammscape.com website:`,
        ``,
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || '(not provided)'}`,
        ``,
        `Message:`,
        message || '(no message)',
      ].join('\n'),
    })

    if (error) {
      console.error('Resend failed to send contact email:', error)
      return NextResponse.json(
        { error: 'Failed to send email.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error handling contact form submission:', err)
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 }
    )
  }
}
