// =============================================================================
// FLOATING CTA BUTTON — components/FloatingCTA.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   Renders the small round button with an envelope icon that stays pinned
//   to the bottom-right corner of the screen at all times (it "floats"
//   over the page content, even while scrolling). "CTA" stands for
//   "Call To Action" — a button designed to prompt the visitor to do
//   something, in this case, request more info.
//
// DEPENDS ON:
//   - The "onClick" function passed in by whichever page uses it — this
//     component doesn't decide what happens when clicked, it just displays
//     the button and reports the click upward.
//   - The .floating-cta CSS class in app/globals.css, which handles the
//     fixed positioning, size, color, and shadow.
//
// USED BY / DEPENDED ON BY:
//   - app/page.tsx renders this once, passing it handleCTAClick, which
//     jumps the visitor to the "Request Info" tab and scrolls it into view.
// =============================================================================

'use client'

export interface FloatingCTAProps {
  onClick: () => void
}

export default function FloatingCTA({ onClick }: FloatingCTAProps) {
  return (
    <button
      onClick={onClick}
      className="floating-cta group"
      title="Request more information"
      aria-label="Open request form"
    >
      {/* Envelope/mail icon (drawn with SVG lines, not an image file).
          Slightly enlarges on hover for a subtle interactive effect. */}
      <svg
        className="w-6 h-6 group-hover:scale-110 transition-transform"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    </button>
  )
}
