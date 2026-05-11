import nodemailer from 'nodemailer'

const SMTP_PASSWORD = process.env.ZEPTO_MAIL_PASSWORD
const FROM_EMAIL = 'hello@dermaspaceng.com'
const FROM_NAME = 'Dermaspace'

// Create SMTP transporter for Zepto Mail
// Username for Zepto Mail SMTP is "emailapikey", password is your SendMail token
const transporter = nodemailer.createTransport({
  host: 'smtp.zeptomail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'emailapikey',
    pass: SMTP_PASSWORD
  }
})

interface EmailOptions {
  to: string
  subject: string
  html: string
}

// Brand color — exported below so individual templates can reference
// it without re-declaring the hex everywhere.
const BRAND_COLOR = '#7B2D8E'
// Public origin for absolute image URLs. Email clients block
// relative paths, so every <img> src has to be a full URL. Falls
// back to the marketing domain when NEXT_PUBLIC_APP_URL isn't set
// (e.g. local dev without env file).
const PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://www.dermaspaceng.com'

interface EmailTemplateOptions {
  /** Hidden Gmail / Apple Mail preview line (~90 chars shown next
   *  to the subject in inbox lists). Massively improves preview
   *  quality when set per-template. Omitted when undefined. */
  preheader?: string
  /** Tiny uppercase chip rendered above the hero ("APPOINTMENT
   *  CONFIRMED", "WELCOME ABOARD", etc.) — sets context the moment
   *  the email opens. */
  eyebrow?: string
  /** Optional illustrated hero image. MUST be an absolute URL
   *  (email clients block relative paths). Pair with `heroAlt`
   *  for screen readers and image-blocking clients. */
  heroImage?: string
  /** Alt text for the hero. Required when `heroImage` is set. */
  heroAlt?: string
  /** Background color behind the hero image — matches the
   *  illustration's negative space so transparent-PNG hero art
   *  blends seamlessly. Defaults to a soft brand-purple wash. */
  heroBg?: string
}

/**
 * Base email template — table-based, inline-styled, email-client
 * safe. Width pinned at 560px — slightly narrower than the
 * historical 600px so the body reads compactly on phones (the
 * Cloudflare / Linear / Stripe transactional shells all sit in
 * the 560–600 band; we picked the tighter end). Mirrors what
 * big tech transactional emails ship:
 *
 *   1. Thin brand accent strip at the very top — identifies the
 *      sender even when the recipient client hides external imagery.
 *   2. Header bar with the Dermaspace LOGO ONLY (no wordmark text)
 *      and a subtle "ESTHETIC & WELLNESS" caption on the right,
 *      hairline divider underneath. The logo file already contains
 *      the Dermaspace mark visually — adding a separate "Dermaspace"
 *      text next to it created the doubled-up brand we used to ship.
 *   3. Optional eyebrow chip + hero illustration — used for
 *      milestone emails (welcome, booking confirmed, receipt,
 *      ticket created / resolved).
 *   4. Content block (passed in by the caller, rendered as-is).
 *   5. Footer with a contact icon row, address block, and legal.
 *      Footer chrome is unified across every transactional email
 *      so the brand reads consistently.
 *
 * The signature stays backward-compatible with the previous
 * single-string call (`getEmailTemplate(content)`) — the new
 * `options` arg is optional, so existing templates keep working.
 */
function getEmailTemplate(
  content: string,
  options: EmailTemplateOptions = {},
) {
  const {
    preheader,
    eyebrow,
    // `heroImage`, `heroAlt`, and `heroBg` are accepted for
    // backward compatibility with the existing call sites
    // (verify, booking, gift-card, welcome, ticket, ticket-reply,
    // ticket-transcript, ticket-resolved) but are intentionally
    // unused. The admin asked for a Cloudflare / Zoom / Upstash
    // style — those references *do not use illustrations*. Their
    // playbook is: thin brand accent bar at the top, small
    // wordmark, bold headline, optional small tinted info block,
    // a single solid CTA, signed footer. Generated chat-bubble /
    // envelope / key / wallet illustrations always looked like
    // stock filler in our brand context, so we stopped rendering
    // them rather than trying to keep redesigning them. The
    // params stay on the type so callers don't break and we can
    // re-enable selective illustrations later if needed.
  } = options

  // Hidden preheader span — Gmail / Apple Mail surface it next to
  // the subject line in inbox lists. Padded with non-breaking
  // spaces so longer inbox previews don't leak the email's first
  // real sentence.
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">${escapeHtml(preheader)}${'&nbsp;&zwnj;'.repeat(80)}</div>`
    : ''

  // Eyebrow chip — small, uppercase, purple-on-purple-wash. Sits
  // centred above the hero (or above the content when there's no
  // hero). Renders only when the caller asks for one.
  const eyebrowHtml = eyebrow
    ? `
      <tr>
        <td align="center" style="padding: 28px 24px 0;">
          <span style="display:inline-block;padding:6px 12px;background-color:${BRAND_COLOR}1A;color:${BRAND_COLOR};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;border-radius:999px;">
            ${escapeHtml(eyebrow)}
          </span>
        </td>
      </tr>
    `
    : ''

  // Hero illustration block — intentionally always empty now.
  // See the comment on the destructured `heroImage` / `heroAlt` /
  // `heroBg` options above for the rationale. Leaving the named
  // constant in place (rather than inlining `''` into the shell
  // template below) keeps the structural symmetry with `eyebrowHtml`
  // and makes it a one-line revert if we ever decide to selectively
  // bring back a *custom-designed* illustration for a single
  // template (e.g. a hand-illustrated holiday card).
  const heroHtml = ''

  // ─────────────────────────────────────────────────────────────
  // Email shell — flat / full-bleed redesign (May 2026)
  // ─────────────────────────────────────────────────────────────
  // The previous layout was a 560px white "card" centred on a grey
  // (#f6f4f8) page background. The admin reported it as:
  //
  //   "our email isn't wide enough, the card should be full page, no
  //    need of adding like card again should be plain, they look so
  //    big not looking good at all, kt responsive too"
  //
  // So the chrome is now:
  //   • white body (no surrounding grey frame, no card-in-card)
  //   • a single full-width column with a max width of 640px so the
  //     message gets more room to breathe but text still wraps at a
  //     comfortable measure on a desktop client
  //   • the rounded corner + 1px card border are gone — the email
  //     reads as a plain document, not a popup card
  //   • header / content / footer are tighter (less vertical padding)
  //     so the message no longer feels oversized in Gmail's reading
  //     pane
  //   • on phones the column fills the viewport and the side padding
  //     drops to 16px so the inbox doesn't waste 40% of the screen on
  //     blank gutters
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Dermaspace</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
  </style>
  <![endif]-->
  <style>
    a:not([style*="background"]) { color: ${BRAND_COLOR}; text-decoration: none; }
    a:not([style*="background"]):visited { color: ${BRAND_COLOR}; }
    a:not([style*="background"]):hover { text-decoration: underline; }
    /* Phone breakpoint — the column collapses to full width and the
       horizontal padding drops to 16px so the message text uses every
       pixel of a narrow viewport. */
    @media only screen and (max-width: 640px) {
      .ds-shell   { width: 100% !important; max-width: 100% !important; }
      .ds-content { padding: 20px 16px !important; }
      .ds-header  { padding: 16px 16px !important; }
      .ds-footer  { padding: 18px 16px !important; }
      .ds-footer-cell { display: block !important; width: 100% !important; padding: 0 0 8px !important; }
      .ds-h1 { font-size: 20px !important; line-height: 1.3 !important; }
      .ds-body { font-size: 15px !important; line-height: 1.6 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1c1e21; -webkit-font-smoothing: antialiased;">
  ${preheaderHtml}

  <!-- Brand accent strip — a 5px brand-purple bar at the very top of
       the email, exactly the Cloudflare / Stripe / Linear move. This
       is the single most identifiable piece of chrome when images
       are blocked: even in plain-text inbox previews the customer
       still gets a flash of Dermaspace purple before they read the
       subject. Slightly thicker than the 3px we shipped originally so
       it actually registers on a 600px-wide Gmail preview pane
       without feeling decorative. -->
  <div style="height: 5px; background-color: ${BRAND_COLOR}; line-height: 5px; font-size: 0;">&nbsp;</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 0;">
        <!-- Single column shell. No background card, no rounded
             corners, no border — the email lives directly on the
             white body so it reads as a plain branded document. -->
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" class="ds-shell" style="max-width: 640px; width: 100%; background-color: #ffffff;">

          <!-- Header: a single centered logo, full stop.
               Previous revisions tried to pair the wordmark with an
               "ESTHETIC & WELLNESS" caption on the right (admin
               feedback: "looks like Google / Vercel / Facebook
               wouldn't design like this"). The complaint was right —
               our PNG already includes "Esthetic And Wellness Centre"
               underneath the butterfly mark, so a separate caption is
               redundant *and* visually unbalanced because the logo
               sits left while a small all-caps label floats far right
               with a lot of dead air between them. Replacing that
               two-column layout with a single centered wordmark keeps
               the email reading like a polished transactional
               document. A hairline underneath still separates header
               from body so the structure doesn't collapse. -->
          <tr>
            <td class="ds-header" align="center" style="padding: 24px 28px; border-bottom: 1px solid #efeaf2; text-align: center;">
              <a href="${PUBLIC_ORIGIN}" style="text-decoration: none; display: inline-block;">
                <img src="${PUBLIC_ORIGIN}/images/dermaspace-logo.png" alt="Dermaspace Esthetic & Wellness Centre" height="40" style="display: block; height: 40px; width: auto; border: 0; outline: none; margin: 0 auto;" />
              </a>
            </td>
          </tr>

          ${eyebrowHtml}
          ${heroHtml}

          <!-- Content -->
          <tr>
            <!--
              Content cell. Top padding shrinks to 8px when there's
              an eyebrow chip above (the chip already provides the
              breathing room); otherwise we use the full 28px so the
              headline doesn't hug the header divider.
            -->
            <td class="ds-content" style="padding: ${eyebrow ? '8px 32px 28px' : '28px 32px'};">
              ${content}
            </td>
          </tr>

          <!-- Footer: hairline divider, contact row, address, legal.
               No grey background block any more — the footer sits on
               the same white page as the rest of the email so the
               document feels like one continuous letter. -->
          <tr>
            <td class="ds-footer" style="padding: 20px 28px 28px; border-top: 1px solid #efeaf2;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 12px;">
                <tr>
                  <td class="ds-footer-cell" valign="top" style="padding-right: 12px; vertical-align: top; font-size: 12px; color: #5b5d63; line-height: 1.55;">
                    ${footerIcon('mail')}<a href="mailto:hello@dermaspaceng.com" style="color:${BRAND_COLOR};font-weight:600;">hello@dermaspaceng.com</a>
                  </td>
                  <td class="ds-footer-cell" valign="top" style="padding-right: 12px; vertical-align: top; font-size: 12px; color: #5b5d63; line-height: 1.55;">
                    ${footerIcon('phone')}<a href="tel:+2348167764757" style="color:${BRAND_COLOR};font-weight:600;">+234 816 776 4757</a>
                  </td>
                  <td class="ds-footer-cell" valign="top" style="vertical-align: top; font-size: 12px; color: #5b5d63; line-height: 1.55;">
                    ${footerIcon('globe')}<a href="${PUBLIC_ORIGIN}" style="color:${BRAND_COLOR};font-weight:600;">dermaspaceng.com</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; line-height: 1.6;">
                <strong style="color:#1c1e21;font-weight:600;">Victoria Island</strong> &nbsp;·&nbsp; 237b Muri Okunola St, Lagos<br>
                <strong style="color:#1c1e21;font-weight:600;">Ikoyi</strong> &nbsp;·&nbsp; 9 Agbeke Rotinwa Cl, Dolphin Ext. Estate, Lagos
              </p>

              <p style="margin: 12px 0 0; font-size: 11px; color: #8a8b91; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} Dermaspace Esthetic &amp; Wellness Centre. All rights reserved.<br>
                You&apos;re receiving this email because you&apos;re a Dermaspace customer.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Tiny escape helper for any user-controllable string we drop into
 * the template. We don't escape the `content` block because callers
 * are trusted internal templates that intentionally include HTML.
 */
function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Inline SVG icons used in the email footer. Tiny (14×14),
 * stroke-only, brand purple — render crisp in light/dark previews
 * and don't depend on a hosted image asset.
 */
function footerIcon(kind: 'mail' | 'phone' | 'globe'): string {
  const common = `width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"`
  if (kind === 'mail') {
    return `<svg ${common}><rect x="2" y="4" width="20" height="16" rx="3"></rect><path d="m22 7-10 6L2 7"></path></svg>`
  }
  if (kind === 'phone') {
    return `<svg ${common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"></path></svg>`
  }
  return `<svg ${common}><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
}

// Brand color is re-exported for individual templates and tests
// that need to reference it without re-declaring the hex.
export { BRAND_COLOR }

/**
 * Send a single piece of a newsletter campaign.
 *
 * Used by both the "Send to test address" and "Send to full list"
 * admin actions — they pass the same shape, only the `to` address
 * and the unsubscribe URL change. We keep the body assembly here
 * (rather than in the route handler) so the campaign always
 * inherits the unified Dermaspace email shell — header, eyebrow,
 * footer, etc. The route only owns the *content*.
 *
 * Inputs are deliberately permissive (`null` allowed for every
 * optional field) because the admin form lets editors leave the
 * eyebrow / headline / CTA blank for plain-text-style updates.
 *
 * `bodyHtml` is the WYSIWYG payload from the campaign editor and is
 * rendered verbatim — the editor sanitizes its own output, and
 * we trust it the same way the rest of the templates trust their
 * `content` arg.
 */
export async function sendNewsletterCampaign(input: {
  to: string
  subject: string
  preheader?: string | null
  eyebrow?: string | null
  headline?: string | null
  bodyHtml: string
  ctaLabel?: string | null
  ctaUrl?: string | null
  /** Per-recipient unsubscribe link. Always rendered even on test
   *  sends so admins can verify the link works. */
  unsubscribeUrl: string
}): Promise<boolean> {
  const headlineHtml = input.headline
    ? `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:700;color:#1c1e21;">${escapeHtml(
        input.headline,
      )}</h1>`
    : ''

  const ctaHtml =
    input.ctaLabel && input.ctaUrl
      ? `
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px;">
          <tr>
            <td style="border-radius:10px;background-color:${BRAND_COLOR};">
              <a href="${input.ctaUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;background-color:${BRAND_COLOR};">
                ${escapeHtml(input.ctaLabel)}
              </a>
            </td>
          </tr>
        </table>
      `
      : ''

  // Per-recipient footer line. Lives *inside* the content block (not
  // the shared chrome footer) because it has to differ per email —
  // each subscriber gets their own unsubscribe URL.
  const unsubscribeLine = `
    <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #ececf2;font-size:11.5px;line-height:1.6;color:#8a8b91;">
      You&apos;re receiving this because you signed up for Dermaspace updates.
      <a href="${input.unsubscribeUrl}" style="color:${BRAND_COLOR};font-weight:600;">Unsubscribe</a>.
    </p>
  `

  const content = `
    ${headlineHtml}
    <div style="font-size:15px;line-height:1.6;color:#1c1e21;">
      ${input.bodyHtml}
    </div>
    ${ctaHtml}
    ${unsubscribeLine}
  `

  const html = getEmailTemplate(content, {
    preheader: input.preheader || undefined,
    eyebrow: input.eyebrow || undefined,
  })

  return sendEmail({
    to: input.to,
    subject: input.subject,
    html,
  })
}

// Send email via Zepto Mail SMTP
async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!SMTP_PASSWORD) {
    console.error('ZEPTO_MAIL_PASSWORD not configured')
    return false
  }
  
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html
    })
    
    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

// Email verification - Clean design like Facebook
export async function sendVerificationEmail(email: string, firstName: string, token: string): Promise<boolean> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`
  
  const content = `
    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 400; color: #1c1e21; line-height: 1.2;">One more step to sign up</h1>
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #1c1e21; line-height: 1.5;">
      Hi ${firstName},
    </p>
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #1c1e21; line-height: 1.5;">
      We got your request to create an account. Click the button below to verify your email:
    </p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;" width="100%">
      <tr>
        <td>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; background-color: ${BRAND_COLOR}; border-radius: 6px;">
            Verify Email
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 8px; font-size: 14px; color: #65676b; line-height: 1.5;">
      This link will expire in 24 hours.
    </p>
    
    <p style="margin: 0; font-size: 14px; color: #65676b; line-height: 1.5;">
      If you didn&apos;t request this, you can safely ignore this email.
    </p>
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #1c1e21; line-height: 1.5;">
      Thanks,<br>
      Dermaspace Team
    </p>
  `
  
  return sendEmail({
    to: email,
    subject: 'Verify Your Email - Dermaspace',
    html: getEmailTemplate(content, {
      preheader: `Confirm your email to finish creating your Dermaspace account. Link expires in 24 hours.`,
      eyebrow: 'Verify your email',
      heroImage: `${PUBLIC_ORIGIN}/emails/hero-verify.jpg`,
      heroAlt: 'Sealed envelope with a verification check-mark',
    }),
  })
}

// Consultation confirmation
export async function sendConsultationConfirmation(data: {
  email: string
  firstName: string
  location: string
  date: string
  time: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Consultation Requested</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Thank you for requesting a consultation with Dermaspace. Our team will review your request and confirm your appointment within 24 hours.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px; padding: 20px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase; letter-spacing: 1px;">Appointment Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 100px;">Location:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.location}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Date:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Time:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.time}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If you need to reschedule or cancel, please contact us at info@dermaspaceng.com or call +234 816 776 4757.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Consultation Request Received - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// New device login alert
export async function sendNewDeviceAlert(data: {
  email: string
  firstName: string
  deviceInfo: string
  ipAddress: string
  location: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">New Login Detected</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      We detected a new login to your Dermaspace account from a device we don't recognize.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fff8e6; border-radius: 12px; border: 1px solid #f0d78c;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #856404;">Login Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #666; width: 100px;">Device:</td>
              <td style="padding: 6px 0; font-size: 14px; color: #1a1a1a;">${data.deviceInfo}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #666;">IP Address:</td>
              <td style="padding: 6px 0; font-size: 14px; color: #1a1a1a;">${data.ipAddress}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #666;">Location:</td>
              <td style="padding: 6px 0; font-size: 14px; color: #1a1a1a;">${data.location}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If this was you, you can ignore this email. If you didn't log in, please change your password immediately and contact us.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'New Login to Your Account - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Booking confirmation
export async function sendBookingConfirmation(data: {
  email: string
  firstName: string
  service: string
  location: string
  date: string
  time: string
  amount: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Booking Confirmed!</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Your appointment has been confirmed. We look forward to seeing you!
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #faf6fc; border-radius: 12px; border: 1px solid #e8d8ee;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase; letter-spacing: 1px;">Booking Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 100px;">Service:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.service}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Location:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.location}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Date:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Time:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Amount:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">${data.amount}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Please arrive 10 minutes before your appointment. For cancellations or rescheduling, contact us at least 24 hours in advance.
    </p>
  `

  return sendEmail({
    to: data.email,
    subject: 'Appointment Confirmed - Dermaspace',
    html: getEmailTemplate(content, {
      preheader: `Your ${data.service} on ${data.date} at ${data.time} is locked in. We can't wait to see you.`,
      eyebrow: 'Appointment confirmed',
      heroImage: `${PUBLIC_ORIGIN}/emails/hero-booking.jpg`,
      heroAlt: 'Calendar with a marked appointment day',
    }),
  })
}

// ---------------------------------------------------------------------------
// Booking payment-failed recovery email
// ---------------------------------------------------------------------------
// Sent by `notifyBookingPaymentFailed` (webhook) and the admin "Send
// recovery link" button. The recovery URL is a one-time token that
// drops the customer straight back into Paystack with the same line
// items — no need to re-pick services or re-enter card details.
//
// Design choices that came from product feedback:
//   * Header band uses the brand purple #7B2D8E so it matches the
//     confirmation email visually — the customer should feel like
//     these belong to the same conversation, not a generic alert.
//   * The reason from the gateway is shown verbatim inside a soft
//     red card so the customer knows what to fix (insufficient
//     funds vs. card declined vs. timed out, …).
//   * Single, primary CTA. No secondary links — anything that
//     distracts from "tap here to finish your booking" hurts
//     conversion.
function fmtNairaForEmail(kobo: number) {
  return `\u20A6${(kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
}

export async function sendBookingPaymentFailedEmail(data: {
  to: string
  customerName: string
  bookingReference: string
  appointmentDate: string
  appointmentTime: string
  totalKobo: number
  locationName: string
  reason: string
  recoveryUrl: string
}): Promise<boolean> {
  const firstName = (data.customerName || '').split(' ')[0] || 'there'
  const dateLabel = new Date(`${data.appointmentDate}T00:00:00.000Z`)
    .toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background: linear-gradient(135deg, #7B2D8E 0%, #5A1D6A 100%); border-radius: 14px;">
      <tr>
        <td style="padding: 28px 24px; text-align: center;">
          <div style="display:inline-block; width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.18); line-height:48px; text-align:center; margin-bottom:14px;">
            <span style="font-size:22px; color:#ffffff;">!</span>
          </div>
          <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">Your payment didn\u2019t go through</h2>
          <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.86);">We\u2019re still holding your slot \u2014 finish in one tap.</p>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 20px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${firstName},<br><br>
      We noticed your payment for booking <strong style="color:#7B2D8E; font-family:'SF Mono',monospace;">${data.bookingReference}</strong> didn\u2019t complete. The good news: your appointment slot is still reserved for you, so you don\u2019t need to start over.
    </p>

    ${data.reason ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
      <tr>
        <td style="padding: 16px 18px;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.6px;">Reason from your bank</p>
          <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.5;">${data.reason}</p>
        </td>
      </tr>
    </table>` : ''}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px; border: 1px solid #e9d5ff;">
      <tr>
        <td style="padding: 18px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #6b7280; width: 110px;">Appointment</td>
              <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">${dateLabel} \u00b7 ${data.appointmentTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Location</td>
              <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">${data.locationName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Amount due</td>
              <td style="padding: 6px 0; font-size: 14px; color: #7B2D8E; font-weight: 700;">${fmtNairaForEmail(data.totalKobo)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td align="center">
          <a href="${data.recoveryUrl}" style="display:inline-block; padding: 14px 32px; background-color: #7B2D8E; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 15px; font-weight: 700; box-shadow: 0 6px 20px rgba(123,45,142,0.28);">Finish my booking \u2192</a>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #888; text-align: center; line-height: 1.6;">
      This recovery link is unique to you and expires in 7 days.<br>
      If you didn\u2019t try to book, you can safely ignore this email \u2014 nothing was charged.
    </p>
  `
  return sendEmail({
    to: data.to,
    subject: `Finish your Dermaspace booking ${data.bookingReference}`,
    html: getEmailTemplate(content),
  })
}

// ---------------------------------------------------------------------------
// "Ready to rebook?" reminder for cancelled bookings
// ---------------------------------------------------------------------------
// Triggered manually by an admin from the cancelled-booking detail page.
// The CTA deep-links into the booking wizard with `?rebookFrom=…` so
// the wizard can pre-populate the same services / location and shave
// the rebook flow down to a couple of taps.
export async function sendBookingRebookReminderEmail(data: {
  to: string
  customerName: string
  bookingReference: string
  appointmentDate: string
  locationName: string
  message: string
  rebookUrl: string
}): Promise<boolean> {
  const firstName = (data.customerName || '').split(' ')[0] || 'there'
  const dateLabel = new Date(`${data.appointmentDate}T00:00:00.000Z`)
    .toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background: linear-gradient(135deg, #7B2D8E 0%, #5A1D6A 100%); border-radius: 14px;">
      <tr>
        <td style="padding: 28px 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">Ready when you are</h2>
          <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.86);">Pick up where you left off \u2014 in just a few taps.</p>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 20px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${firstName},<br><br>
      ${data.message}
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px; border: 1px solid #e9d5ff;">
      <tr>
        <td style="padding: 18px 20px;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #7B2D8E; text-transform: uppercase; letter-spacing: 0.6px;">Original booking</p>
          <p style="margin: 0; font-size: 14px; color: #111827;">
            <strong>${data.bookingReference}</strong> \u00b7 ${dateLabel} \u00b7 ${data.locationName}
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td align="center">
          <a href="${data.rebookUrl}" style="display:inline-block; padding: 14px 32px; background-color: #7B2D8E; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 15px; font-weight: 700; box-shadow: 0 6px 20px rgba(123,45,142,0.28);">Rebook now \u2192</a>
        </td>
      </tr>
    </table>
  `
  return sendEmail({
    to: data.to,
    subject: `Rebook your Dermaspace appointment`,
    html: getEmailTemplate(content),
  })
}

// ---------------------------------------------------------------------------
// Per-event reminder emails (sent by /api/internal/reminders/dispatch)
// ---------------------------------------------------------------------------
// All three share the same visual treatment as sendBookingConfirmation —
// brand purple #7B2D8E header band on a soft #f8f5fa info card. We
// deliberately keep the copy short: a reminder is a nudge, not an
// onboarding email.

// Booking — fired ~24h before the appointment
export async function sendBookingReminder(data: {
  email: string
  firstName: string
  service: string
  location: string
  date: string
  time: string
  bookingReference: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">See you tomorrow</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Just a friendly reminder that your appointment with Dermaspace is coming up tomorrow. Here are the details:
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase; letter-spacing: 1px;">Appointment</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr><td style="padding: 8px 0; font-size: 14px; color: #666; width: 100px;">Service:</td><td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.service}</td></tr>
            <tr><td style="padding: 8px 0; font-size: 14px; color: #666;">Location:</td><td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.location}</td></tr>
            <tr><td style="padding: 8px 0; font-size: 14px; color: #666;">Date:</td><td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.date}</td></tr>
            <tr><td style="padding: 8px 0; font-size: 14px; color: #666;">Time:</td><td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.time}</td></tr>
            <tr><td style="padding: 8px 0; font-size: 14px; color: #666;">Reference:</td><td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.bookingReference}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px; font-size: 14px; color: #4a4a4a; line-height: 1.6;">
      Please arrive 10 minutes early. If you need to reschedule, reply to this email or call <strong>+234 816 776 4757</strong> as soon as possible.
    </p>
  `
  return sendEmail({
    to: data.email,
    subject: 'Reminder: Your Dermaspace appointment is tomorrow',
    html: getEmailTemplate(content),
  })
}

// Consultation — fired ~1h before the appointment
export async function sendConsultationReminder(data: {
  email: string
  firstName: string
  location: string
  date: string
  time: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Your consultation starts soon</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Your skincare consultation with Dermaspace is in about an hour. Here are the details so you have everything in one place:
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr><td style="padding: 8px 0; font-size: 14px; color: #666; width: 100px;">Location:</td><td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.location}</td></tr>
            <tr><td style="padding: 8px 0; font-size: 14px; color: #666;">Date:</td><td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.date}</td></tr>
            <tr><td style="padding: 8px 0; font-size: 14px; color: #666;">Time:</td><td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.time}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; color: #888;">
      If something has come up, please call <strong>+234 816 776 4757</strong> so we can free the slot for someone else.
    </p>
  `
  return sendEmail({
    to: data.email,
    subject: 'Heads up: Your Dermaspace consultation is in 1 hour',
    html: getEmailTemplate(content),
  })
}

// Voucher — fired ~24h before expires_at
export async function sendVoucherExpiryReminder(data: {
  email: string
  firstName: string
  code: string
  label: string | null
  description: string | null
  expiresAtFormatted: string
}): Promise<boolean> {
  const headline = data.label
    ? `${data.label} expires tomorrow`
    : `Your voucher expires tomorrow`
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">${headline}</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      A heads-up that your Dermaspace voucher is set to expire on <strong>${data.expiresAtFormatted}</strong>. Use it before then to save on your next treatment.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 11px; color: #7B2D8E; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Voucher code</p>
          <p style="margin: 0 0 12px; font-size: 28px; color: #1a1a1a; font-weight: 700; letter-spacing: 2px; font-family: monospace;">${data.code}</p>
          ${data.description ? `<p style="margin: 0; font-size: 13px; color: #666; line-height: 1.5;">${data.description}</p>` : ''}
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 999px;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dermaspaceng.com'}/booking" style="display: inline-block; padding: 12px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px;">Book now</a>
        </td>
      </tr>
    </table>
  `
  return sendEmail({
    to: data.email,
    subject: `Your Dermaspace voucher expires tomorrow`,
    html: getEmailTemplate(content),
  })
}

// Gift card request to admin
export async function sendGiftCardRequestToAdmin(data: {
  amount: number
  design: string
  designName?: string
  designGradient?: string
  occasion: string
  font: string
  fontName?: string
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  senderName: string
  senderEmail: string
  personalMessage: string
  deliveryMethod: string
  deliveryDate: string
}): Promise<boolean> {
  // Safely handle values that could be undefined
  const displayDesignName = data.designName || data.design || 'Not specified'
  const displayFontName = data.fontName || data.font || 'Not specified'
  const displayRecipientEmail = data.recipientEmail || 'Not provided'
  const displaySenderName = data.senderName || 'Not provided'
  const displaySenderEmail = data.senderEmail || 'Not provided'
  const displayOccasion = data.occasion || 'Not specified'
  const displayDeliveryMethod = data.deliveryMethod || 'Email'

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">New Gift Card Request</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      A new gift card request has been submitted. Please review the details below and process the order.
    </p>
    
    <!-- Gift Card Visual Preview -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px;">
      <tr>
        <td style="padding: 24px; background: linear-gradient(135deg, #7B2D8E 0%, #9B4DB0 100%); border-radius: 16px; text-align: center;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
            <tr>
              <td style="padding: 12px 20px; background-color: rgba(255,255,255,0.95); border-radius: 20px;">
                <span style="font-weight: 700; color: #7B2D8E; font-size: 14px;">Dermaspace</span>
              </td>
              <td style="width: 16px;"></td>
              <td style="padding: 8px 16px; background-color: rgba(255,255,255,0.2); border-radius: 20px; border: 1px solid rgba(255,255,255,0.3);">
                <span style="font-weight: 700; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Gift Card</span>
              </td>
            </tr>
          </table>
          <p style="margin: 20px 0 8px; color: rgba(255,255,255,0.8); font-size: 12px;">For: <strong style="color: #ffffff;">${data.recipientName || 'Recipient'}</strong></p>
          <p style="margin: 0 0 8px; color: rgba(255,255,255,0.7); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Amount</p>
          <p style="margin: 0 0 16px; color: #ffffff; font-size: 36px; font-weight: 700;">N${data.amount.toLocaleString()}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
            <tr>
              <td style="padding: 6px 12px; background-color: rgba(255,255,255,0.15); border-radius: 20px;">
                <span style="color: #ffffff; font-size: 11px;">${displayOccasion}</span>
              </td>
              <td style="width: 12px;"></td>
              <td>
                <span style="color: rgba(255,255,255,0.8); font-size: 12px;">From: <strong style="color: #ffffff;">${displaySenderName}</strong></span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase;">Gift Card Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Amount:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">N${data.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Card Design:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayDesignName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Occasion:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayOccasion}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Font Style:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayFontName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Delivery Method:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayDeliveryMethod}</td>
            </tr>
            ${data.deliveryDate ? `<tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Delivery Date:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.deliveryDate}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px; background-color: #f0f9ff; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #0369a1; text-transform: uppercase;">Recipient Information</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Name:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.recipientName || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Email:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayRecipientEmail}</td>
            </tr>
            ${data.recipientPhone ? `<tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Phone:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.recipientPhone}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px; background-color: #fef3c7; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #92400e; text-transform: uppercase;">Sender Information</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Name:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${displaySenderName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Email:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displaySenderEmail}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    ${data.personalMessage ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #374151;">Personal Message</h3>
          <p style="margin: 0; font-size: 14px; color: #4b5563; font-style: italic;">"${data.personalMessage}"</p>
        </td>
      </tr>
    </table>
    ` : ''}
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Please process this request and send payment instructions to the sender at ${displaySenderEmail}.
    </p>
  `
  
  return sendEmail({
    to: 'admin@dermaspaceng.com',
    subject: `New Gift Card Request - N${data.amount.toLocaleString()} - ${displaySenderName}`,
    html: getEmailTemplate(content)
  })
}

// Gift card confirmation to user
export async function sendGiftCardConfirmation(data: {
  userEmail: string
  userName: string
  amount: number
  recipientName: string
  occasion: string
  designName?: string
}): Promise<boolean> {
  // Safely handle undefined values
  const displayUserName = data.userName || 'Valued Customer'
  const displayRecipientName = data.recipientName || 'Recipient'
  const displayOccasion = data.occasion || 'Special Occasion'
  const displayDesignName = data.designName || 'Custom Design'

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Gift Card Request Received!</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${displayUserName},<br><br>
      Thank you for your gift card request! We've received your order and our team will process it shortly.
    </p>
    
    <!-- Gift Card Visual Preview -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="padding: 20px; background: linear-gradient(135deg, #7B2D8E 0%, #9B4DB0 100%); border-radius: 12px; text-align: center;">
          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 11px;">Gift Card for</p>
          <p style="margin: 0 0 12px; color: #ffffff; font-size: 16px; font-weight: 600;">${displayRecipientName}</p>
          <p style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">N${data.amount.toLocaleString()}</p>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 12px;">${displayOccasion}</p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #166534; text-transform: uppercase;">Order Summary</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 120px;">Gift Card Value:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">N${data.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Recipient:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${displayRecipientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Occasion:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayOccasion}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Card Design:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayDesignName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1a1a1a;">What&apos;s Next?</h3>
    <ol style="margin: 0 0 24px; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
      <li>Our team will review your gift card design</li>
      <li>You&apos;ll receive payment instructions via email</li>
      <li>Once payment is confirmed, the gift card will be created</li>
      <li>The gift card will be delivered according to your preference</li>
    </ol>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If you have any questions, please contact us at hello@dermaspaceng.com or call +234 901 797 2919.
    </p>
  `
  
  return sendEmail({
    to: data.userEmail,
    subject: 'Gift Card Request Confirmed - Dermaspace',
    html: getEmailTemplate(content, {
      preheader: `Your gift card request is in. We'll email payment instructions shortly.`,
      eyebrow: 'Gift card request',
      heroImage: `${PUBLIC_ORIGIN}/emails/hero-giftcard.jpg`,
      heroAlt: 'A purple gift card with a ribbon bow',
    }),
  })
}

// General form submission confirmation
export async function sendFormConfirmation(data: {
  email: string
  firstName: string
  formType: string
  details: Record<string, string>
}): Promise<boolean> {
  const detailsHtml = Object.entries(data.details)
    .map(([key, value]) => `
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">${key}:</td>
        <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${value}</td>
      </tr>
    `).join('')

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Submission Received</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Thank you for your ${data.formType}. We've received your submission and will get back to you soon.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase;">Submission Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            ${detailsHtml}
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Our team typically responds within 24-48 hours. For urgent inquiries, please call us at +234 901 797 2919.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: `${data.formType} Received - Dermaspace`,
    html: getEmailTemplate(content)
  })
}

// Payment receipt email for gift cards (Paystack integration ready)
export async function sendGiftCardPaymentReceipt(data: {
  userEmail: string
  userName: string
  amount: number
  recipientName: string
  occasion: string
  designName: string
  transactionRef: string
  paymentDate: string
}): Promise<boolean> {
  const displayUserName = data.userName || 'Valued Customer'
  const displayRecipientName = data.recipientName || 'Recipient'
  const displayOccasion = data.occasion || 'Special Occasion'
  const displayDesignName = data.designName || 'Custom Design'

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Payment Confirmed!</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${displayUserName},<br><br>
      Your payment for the gift card has been successfully processed. We are now creating your beautiful gift card!
    </p>
    
    <!-- Success Badge -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="text-align: center;">
          <div style="display: inline-block; width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; line-height: 64px; text-align: center;">
            <span style="color: #16a34a; font-size: 28px;">&#10003;</span>
          </div>
        </td>
      </tr>
    </table>
    
    <!-- Gift Card Visual Preview -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="padding: 20px; background: linear-gradient(135deg, #7B2D8E 0%, #9B4DB0 100%); border-radius: 12px; text-align: center;">
          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 11px;">Gift Card for</p>
          <p style="margin: 0 0 12px; color: #ffffff; font-size: 16px; font-weight: 600;">${displayRecipientName}</p>
          <p style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">N${data.amount.toLocaleString()}</p>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 12px;">${displayOccasion}</p>
        </td>
      </tr>
    </table>
    
    <!-- Payment Receipt -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase;">Payment Receipt</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Amount Paid:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">N${data.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Transaction Ref:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-family: monospace;">${data.transactionRef}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Payment Date:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.paymentDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Card Design:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayDesignName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Recipient:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayRecipientName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1a1a1a;">What&apos;s Next?</h3>
    <ol style="margin: 0 0 24px; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
      <li>Our design team will create your custom gift card</li>
      <li>The gift card will be delivered within 24 hours</li>
      <li>You&apos;ll receive a notification when it&apos;s ready</li>
    </ol>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Keep this email as your payment receipt. If you have any questions, please contact us at hello@dermaspaceng.com or call +234 901 797 2919.
    </p>
  `
  
  return sendEmail({
    to: data.userEmail,
    subject: 'Payment Confirmed - Gift Card Order - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Payment cancelled email
export async function sendGiftCardPaymentCancelled(data: {
  userEmail: string
  userName: string
  amount: number
  recipientName: string
}): Promise<boolean> {
  const displayUserName = data.userName || 'Valued Customer'
  const displayRecipientName = data.recipientName || 'Recipient'

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Payment Cancelled</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${displayUserName},<br><br>
      Your gift card payment of N${data.amount.toLocaleString()} for ${displayRecipientName} was cancelled or did not complete.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #991b1b;">Payment Not Completed</h3>
          <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
            Your gift card order has not been processed. No charges were made to your account.
          </p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      If you experienced any issues during payment, please try again or contact us for assistance.
    </p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="https://dermaspaceng.com/gift-cards" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Try Again
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Need help? Contact us at hello@dermaspaceng.com or call +234 901 797 2919.
    </p>
  `
  
  return sendEmail({
    to: data.userEmail,
    subject: 'Payment Cancelled - Gift Card Order - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Send newsletter welcome email
export async function sendNewsletterWelcome(email: string): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Welcome to Dermaspace!</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Thank you for subscribing to our newsletter! You're now part of the Dermaspace family.
    </p>
    
    <div style="background-color: #f8f5fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #7B2D8E;">What to expect:</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
        <li>Weekly skincare tips and advice</li>
        <li>Exclusive offers and discounts</li>
        <li>Early access to new treatments</li>
        <li>Beauty and wellness inspiration</li>
      </ul>
    </div>
    
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Ready to book your first treatment? Visit our spa in Victoria Island or Ikoyi.
    </p>
    
    <a href="https://dermaspaceng.com/booking" style="display: inline-block; padding: 14px 28px; background-color: #7B2D8E; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
      Book an Appointment
    </a>
  `
  
  return sendEmail({
    to: email,
    subject: 'Welcome to Dermaspace Newsletter!',
    html: getEmailTemplate(content, {
      preheader: `You're in. Weekly skincare tips, exclusive offers and early access to new treatments are on the way.`,
      eyebrow: 'Welcome aboard',
      heroImage: `${PUBLIC_ORIGIN}/emails/hero-welcome.jpg`,
      heroAlt: 'A purple paper plane carrying the welcome note',
    }),
  })
}

// ============= ADMIN & STAFF NOTIFICATIONS =============

// Staff invitation email
export async function sendStaffInvitation(data: {
  email: string
  inviterName: string
  role: 'staff' | 'admin'
  token: string
}): Promise<boolean> {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${data.token}`
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">You're Invited to Join Dermaspace</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      ${data.inviterName} has invited you to join Dermaspace as a <strong>${data.role}</strong>. 
      Click the button below to create your account and get started.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #7B2D8E;">Your Role</h3>
          <p style="margin: 0; font-size: 14px; color: #4a4a4a; text-transform: capitalize;">
            ${data.role} - You'll have access to the ${data.role} dashboard to manage customer requests.
          </p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${acceptUrl}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: `You're Invited to Join Dermaspace as ${data.role}`,
    html: getEmailTemplate(content)
  })
}

// Reply notification to user
export async function sendReplyNotification(data: {
  email: string
  firstName: string
  // Added 'ticket' so support-ticket replies also email the customer. Previously
  // tickets were silently excluded from the email path even though every other
  // request type (gift card, complaint, consultation) sent one.
  requestType: 'gift_card' | 'complaint' | 'consultation' | 'ticket'
  requestTitle: string
  replyMessage: string
  responderName: string
  newStatus?: string
  // Public ticket code (e.g. DS-2026-000123). When provided we deeplink the
  // "View" button straight to that ticket's thread so the customer lands on
  // the conversation instead of the dashboard root.
  ticketId?: string
}): Promise<boolean> {
  const typeLabels = {
    gift_card: 'Gift Card Request',
    complaint: 'Support Request',
    consultation: 'Consultation Request',
    ticket: 'Support Ticket',
  }
  
  // Status pill, used in the meta row at the bottom of the reply
  // card. Kept the same color logic — only the styling/placement
  // changed (it now sits inline with the ticket reference rather
  // than floating at the top of a busy box).
  const statusBadge = data.newStatus ? `
    <span style="display: inline-block; padding: 3px 10px; background-color: ${
      data.newStatus === 'approved' || data.newStatus === 'confirmed' ? '#dcfce7' :
      data.newStatus === 'rejected' || data.newStatus === 'cancelled' ? '#fef2f2' : '#fef3c7'
    }; color: ${
      data.newStatus === 'approved' || data.newStatus === 'confirmed' ? '#166534' :
      data.newStatus === 'rejected' || data.newStatus === 'cancelled' ? '#991b1b' : '#92400e'
    }; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: capitalize; letter-spacing: 0.2px;">
      ${data.newStatus.replace(/_/g, ' ')}
    </span>
  ` : ''

  // First initial of the responder for the avatar disc. The
  // original "Sidihost Dev" → "S" reads cleanly and ASCII-only so
  // we don't have to worry about emoji-name fallbacks in older
  // mail clients. Guard against an empty string just in case.
  const responderInitial = (data.responderName?.trim()?.[0] || 'D').toUpperCase()

  // Ticket reference line shown in the card footer. Tickets get a
  // human-readable code (DS-2026-…); other request types fall back
  // to the request title only. Kept outside the template literal
  // for readability.
  const ticketRefLine = data.requestType === 'ticket' && data.ticketId
    ? `<span style="font-family: 'SFMono-Regular', Menlo, Consolas, monospace; color: #7B2D8E; font-weight: 600;">${data.ticketId}</span> &middot; ${data.requestTitle}`
    : data.requestTitle

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">You&rsquo;ve got a response</h2>
    <p style="margin: 0 0 28px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName}, ${data.responderName} from the Dermaspace team has
      replied to your ${typeLabels[data.requestType].toLowerCase()}.
    </p>

    <!--
      Reply card — redesigned from the previous "nested box inside a
      tinted box with a thick purple left bar" treatment, which the
      founder flagged as not gorgeous enough. The new layout is
      modeled on the message cards Linear / Stripe / Notion use in
      their notification emails:

        1. A single calm white card with a hairline border and
           generous internal padding — no left accent bar, no
           nested grey box, no thick eyebrow row.
        2. An identity row at the top: a circular brand-purple disc
           with the responder's initial, then their name + the
           "Dermaspace Team" line. This is the bit that makes the
           email feel like a *person* wrote it.
        3. The message body itself, set in slightly larger type with
           comfortable line-height so it reads like a real reply,
           not a quote block.
        4. A subtle hairline divider, then a quiet meta row with
           the ticket reference (code + title) and the status pill.

      Every email client we care about (Gmail iOS/Android, Apple
      Mail, Outlook web) renders this with table layout + inline
      styles, so we deliberately avoid flex/grid and keep all
      visuals to background-color + border + border-radius.
    -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 28px; background-color: #ffffff; border: 1px solid #ece5f0; border-radius: 16px;">
      <tr>
        <td style="padding: 24px 24px 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
            <tr>
              <td width="44" valign="middle" style="width: 44px; padding-right: 14px;">
                <div style="width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background-color: #7B2D8E; color: #ffffff; font-size: 17px; font-weight: 600; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${responderInitial}
                </div>
              </td>
              <td valign="middle">
                <div style="font-size: 15px; font-weight: 600; color: #1a1a1a; line-height: 1.25;">
                  ${data.responderName}
                </div>
                <div style="margin-top: 2px; font-size: 12px; color: #8a8b91; letter-spacing: 0.2px;">
                  Dermaspace Team &middot; replied to you
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 24px 4px;">
          <div style="font-size: 15.5px; color: #1f1f23; line-height: 1.7; white-space: pre-wrap; word-wrap: break-word;">${data.replyMessage}</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 24px 22px;">
          <div style="border-top: 1px solid #f1ecf4; padding-top: 16px;">
            <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
              <tr>
                <td valign="middle" style="font-size: 12px; color: #8a8b91; line-height: 1.5;">
                  ${ticketRefLine}
                </td>
                <td valign="middle" align="right" style="white-space: nowrap; padding-left: 12px;">
                  ${statusBadge}
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}${
            data.requestType === 'ticket' && data.ticketId
              ? `/dashboard/support/${data.ticketId}`
              : '/dashboard'
          }" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            ${data.requestType === 'ticket' ? 'View Ticket' : 'View in Dashboard'}
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      You can view all your requests and responses in your dashboard at any time.
    </p>
  `
  
  // Tickets are the only request type that gets a hero illustration
  // here (the others have their own dedicated milestone emails). The
  // illustrated chat bubbles signal "you got a real human reply"
  // without us having to write that in the subject line.
  const isTicket = data.requestType === 'ticket'

  return sendEmail({
    to: data.email,
    subject: `Response to Your ${typeLabels[data.requestType]} - Dermaspace`,
    html: getEmailTemplate(
      content,
      isTicket
        ? {
            preheader: data.ticketId
              ? `${data.responderName} replied on ticket ${data.ticketId}.`
              : `${data.responderName} replied to your support ticket.`,
            eyebrow: 'New reply',
            heroImage: `${PUBLIC_ORIGIN}/emails/hero-message.jpg`,
            heroAlt: 'Illustrated chat bubbles representing a support reply',
          }
        : {},
    ),
  })
}

// Staff alert: sent when a customer replies to their own ticket so the team
// knows there's a new message waiting in the admin inbox. Mirrors the visual
// language of sendReplyNotification but points at the admin surface.
export async function sendCustomerReplyAlert(data: {
  to: string // admin / support inbox address
  customerName: string
  customerEmail: string
  ticketCode: string
  ticketSubject: string
  replyMessage: string
  adminLinkId: string | number // numeric support_tickets.id used by /admin/complaints/[id]
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">New Customer Reply</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      <strong>${data.customerName}</strong> just replied to ticket
      <strong style="color: #7B2D8E;">${data.ticketCode}</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px; border-left: 4px solid #7B2D8E;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 6px; font-size: 12px; color: #7B2D8E; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Ticket
          </p>
          <p style="margin: 0 0 12px; font-size: 14px; color: #1a1a1a;">
            ${data.ticketSubject}
          </p>
          <div style="padding: 16px; background-color: white; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #1a1a1a; white-space: pre-wrap; line-height: 1.6;">${data.replyMessage}</p>
          </div>
          <p style="margin: 12px 0 0; font-size: 12px; color: #888;">
            From ${data.customerName} &lt;${data.customerEmail}&gt;
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/complaints/${data.adminLinkId}?source=ticket" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Open ticket in admin
          </a>
        </td>
      </tr>
    </table>
  `

  return sendEmail({
    to: data.to,
    subject: `New reply on ticket ${data.ticketCode} - Dermaspace`,
    html: getEmailTemplate(content),
  })
}

// Status update notification
export async function sendStatusUpdateNotification(data: {
  email: string
  firstName: string
  requestType: 'gift_card' | 'complaint' | 'consultation'
  requestTitle: string
  oldStatus: string
  newStatus: string
}): Promise<boolean> {
  const typeLabels = {
    gift_card: 'Gift Card Request',
    complaint: 'Support Request',
    consultation: 'Consultation Request'
  }
  
  // Status pill palette — pulled to match the in-app ticket detail
  // page so the email and dashboard read as one product. We deliberately
  // route every "good" outcome through the brand purple (#7B2D8E) rather
  // than the generic green/blue most transactional emails ship with.
  const statusColors: Record<string, { bg: string; text: string }> = {
    pending:     { bg: '#fef3c7', text: '#92400e' },
    approved:    { bg: '#F3E6F7', text: '#5A1D6A' },
    confirmed:   { bg: '#F3E6F7', text: '#5A1D6A' },
    completed:   { bg: '#F3E6F7', text: '#5A1D6A' },
    resolved:    { bg: '#F3E6F7', text: '#5A1D6A' },
    rejected:    { bg: '#fef2f2', text: '#991b1b' },
    cancelled:   { bg: '#fef2f2', text: '#991b1b' },
    in_progress: { bg: '#fef3c7', text: '#92400e' },
    processing:  { bg: '#fef3c7', text: '#92400e' },
  }
  
  const newStatusColor = statusColors[data.newStatus] || statusColors.pending
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Status Update</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      The status of your ${typeLabels[data.requestType]} has been updated.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f9fafb; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 12px; font-size: 14px; color: #666;">
            <strong>${data.requestTitle}</strong>
          </p>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; padding: 4px 12px; background-color: #f3f4f6; color: #6b7280; border-radius: 20px; font-size: 12px; text-transform: capitalize; text-decoration: line-through;">
              ${data.oldStatus.replace(/_/g, ' ')}
            </span>
            <span style="font-size: 16px; color: #9ca3af;">→</span>
            <span style="display: inline-block; padding: 6px 14px; background-color: ${newStatusColor.bg}; color: ${newStatusColor.text}; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
              ${data.newStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            View Details
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If you have any questions, please don't hesitate to contact us.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: `${typeLabels[data.requestType]} Status Updated - Dermaspace`,
    html: getEmailTemplate(content)
  })
}

// Admin notification for new requests
export async function sendAdminNewRequestNotification(data: {
  adminEmail: string
  requestType: 'gift_card' | 'complaint' | 'consultation' | 'survey'
  customerName: string
  customerEmail: string
  details: string
}): Promise<boolean> {
  const typeLabels = {
    gift_card: 'Gift Card Request',
    complaint: 'New Complaint',
    consultation: 'Consultation Request',
    survey: 'Survey Response'
  }
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">New ${typeLabels[data.requestType]}</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      A new ${typeLabels[data.requestType].toLowerCase()} has been submitted and requires your attention.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase; letter-spacing: 1px;">Customer Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 4px 0; font-size: 14px; color: #666; width: 80px;">Name:</td>
              <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 14px; color: #666;">Email:</td>
              <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a;">${data.customerEmail}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #4a4a4a;">${data.details}</p>
          </div>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/${data.requestType === 'gift_card' ? 'gift-cards' : data.requestType === 'complaint' ? 'complaints' : data.requestType + 's'}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            View in Admin Dashboard
          </a>
        </td>
      </tr>
    </table>
  `
  
  return sendEmail({
    to: data.adminEmail,
    subject: `New ${typeLabels[data.requestType]} - Action Required`,
    html: getEmailTemplate(content)
  })
}

// Password reset email
export async function sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<boolean> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Reset Your Password</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${firstName},<br><br>
      We received a request to reset your password for your Dermaspace account. Click the button below to create a new password.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px; font-size: 13px; color: #888;">
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
    <p style="margin: 0; font-size: 12px; color: #aaa;">
      If the button doesn&apos;t work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #7B2D8E !important; word-break: break-all; text-decoration: none;">${resetUrl}</a>
    </p>
  `
  
  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Security reminder email - tips to secure account
export async function sendSecurityReminderEmail(data: {
  email: string
  firstName: string
  hasPasskey: boolean
  has2FA: boolean
}): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dermaspaceng.com'
  const passkeyUrl = `${appUrl}/dashboard/settings?section=security&action=passkey`
  const twoFAUrl = `${appUrl}/dashboard/settings?section=security&action=2fa`
  const settingsUrl = `${appUrl}/dashboard/settings?section=security`
  
  // Build tips based on what's missing
  const tips: string[] = []
  
  if (!data.hasPasskey) {
    tips.push(`
      <tr>
        <td style="padding: 16px; background-color: #f8f5fa; border-radius: 12px; margin-bottom: 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 48px; vertical-align: top;">
                <div style="width: 40px; height: 40px; background-color: #7B2D8E; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 20px;">&#128274;</span>
                </div>
              </td>
              <td style="padding-left: 12px;">
                <h4 style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #1a1a1a;">Add a Passkey</h4>
                <p style="margin: 0 0 12px; font-size: 13px; color: #666; line-height: 1.5;">
                  Passkeys are the most secure way to sign in. They use your device's biometrics (fingerprint or face) - no password needed!
                </p>
                <a href="${passkeyUrl}" style="display: inline-block; padding: 8px 16px; background-color: #7B2D8E; color: #ffffff; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                  Set Up Passkey
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 12px;"></td></tr>
    `)
  }
  
  if (!data.has2FA) {
    tips.push(`
      <tr>
        <td style="padding: 16px; background-color: #f0f9ff; border-radius: 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 48px; vertical-align: top;">
                <div style="width: 40px; height: 40px; background-color: #0369a1; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 20px;">&#128241;</span>
                </div>
              </td>
              <td style="padding-left: 12px;">
                <h4 style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #1a1a1a;">Enable Two-Factor Authentication</h4>
                <p style="margin: 0 0 12px; font-size: 13px; color: #666; line-height: 1.5;">
                  Add an extra layer of security with 2FA. Even if someone knows your password, they won't be able to access your account.
                </p>
                <a href="${twoFAUrl}" style="display: inline-block; padding: 8px 16px; background-color: #0369a1; color: #ffffff; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                  Enable 2FA
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 12px;"></td></tr>
    `)
  }
  
  // Always include general security tips
  tips.push(`
    <tr>
      <td style="padding: 16px; background-color: #f0fdf4; border-radius: 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width: 48px; vertical-align: top;">
              <div style="width: 40px; height: 40px; background-color: #166534; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 20px;">&#9989;</span>
              </div>
            </td>
            <td style="padding-left: 12px;">
              <h4 style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #1a1a1a;">General Security Tips</h4>
              <ul style="margin: 0; padding-left: 16px; font-size: 13px; color: #666; line-height: 1.6;">
                <li>Use a unique, strong password for your Dermaspace account</li>
                <li>Never share your login credentials with anyone</li>
                <li>Check your account activity regularly for suspicious logins</li>
                <li>Keep your email address up to date for security alerts</li>
              </ul>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `)
  
  const content = `
    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Secure Your Dermaspace Account</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Your account security is important to us. Here are some tips to help keep your Dermaspace account safe and protected.
    </p>
    
    <!-- Security Status -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fafafa; border-radius: 12px; border: 1px solid #e5e7eb;">
      <tr>
        <td style="padding: 16px;">
          <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Your Security Status</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 6px 12px 6px 0;">
                <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 50%; background-color: ${data.hasPasskey ? '#dcfce7' : '#fef2f2'}; font-size: 12px;">
                  ${data.hasPasskey ? '&#10003;' : '&#10007;'}
                </span>
              </td>
              <td style="padding: 6px 0; font-size: 14px; color: ${data.hasPasskey ? '#166534' : '#dc2626'};">
                Passkey ${data.hasPasskey ? 'Enabled' : 'Not Set Up'}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0;">
                <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 50%; background-color: ${data.has2FA ? '#dcfce7' : '#fef2f2'}; font-size: 12px;">
                  ${data.has2FA ? '&#10003;' : '&#10007;'}
                </span>
              </td>
              <td style="padding: 6px 0; font-size: 14px; color: ${data.has2FA ? '#166534' : '#dc2626'};">
                Two-Factor Auth ${data.has2FA ? 'Enabled' : 'Not Enabled'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Security Tips -->
    <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #1a1a1a;">Recommended Actions</h3>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      ${tips.join('')}
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${settingsUrl}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Go to Security Settings
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If you have any questions about account security, please don't hesitate to contact our support team.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Secure Your Account - Dermaspace Security Tips',
    html: getEmailTemplate(content)
  })
}

// Support ticket confirmation
export async function sendTicketConfirmation(data: {
  email: string
  firstName: string
  ticketId: string
  subject: string
  category: string
  }): Promise<boolean> {
  const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://dermaspaceng.com'}/dashboard/support/${data.ticketId}`
  
  const content = `
  <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 400; color: #1c1e21; line-height: 1.2;">We&apos;ve received your support request</h1>
  
  <p style="margin: 0 0 24px; font-size: 16px; color: #1c1e21; line-height: 1.5;">
  Hi ${data.firstName},
  </p>
  
  <p style="margin: 0 0 24px; font-size: 16px; color: #1c1e21; line-height: 1.5;">
  Thank you for contacting Dermaspace Support. We&apos;ve received your request and our team will get back to you as soon as possible.
  </p>
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
  <tr>
  <td style="padding: 20px;">
  <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase; letter-spacing: 1px;">Ticket Details</h3>
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
  <tr>
  <td style="padding: 8px 0; font-size: 14px; color: #666; width: 120px;">Ticket ID:</td>
  <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">${data.ticketId}</td>
  </tr>
  <tr>
  <td style="padding: 8px 0; font-size: 14px; color: #666;">Category:</td>
  <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.category}</td>
  </tr>
  <tr>
  <td style="padding: 8px 0; font-size: 14px; color: #666;">Subject:</td>
  <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.subject}</td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  
  <p style="margin: 0 0 16px; font-size: 14px; color: #65676b; line-height: 1.5;">
  You can view and track the status of your ticket:
  </p>
  
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
  <tr>
  <td>
  <a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; background-color: #7B2D8E; border-radius: 6px;">
  View Ticket
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 14px; color: #65676b; line-height: 1.5;">
      Our typical response time is within 24-48 hours. For urgent matters, please call us directly at +234 816 776 4757.
    </p>
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #1c1e21; line-height: 1.5;">
      Thanks,<br>
      Dermaspace Support Team
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: `Ticket ${data.ticketId} - We've Received Your Request - Dermaspace`,
    html: getEmailTemplate(content, {
      preheader: `We've logged ticket ${data.ticketId}. Our team will get back to you within 24-48 hours.`,
      eyebrow: 'Ticket received',
      heroImage: `${PUBLIC_ORIGIN}/emails/hero-ticket.jpg`,
      heroAlt: 'Illustrated support ticket with a check badge',
    }),
  })
}

// Birthday wish — warm, personal, and gives the customer something to act on
// (a small reason to come back to the spa) without feeling like a hard sell.
// The cron job in /api/cron/birthday-wishes calls this once per customer per
// birthday and is idempotent via users.last_birthday_email_sent_at.
export async function sendBirthdayEmail(data: {
  email: string
  firstName: string
}): Promise<boolean> {
  const name = data.firstName?.trim() || 'there'
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://dermaspaceng.com'}/booking`

  const content = `
    <!-- Hero celebratory banner — solid brand colour, no gradients per brand
         guidelines. Feels like a little card inside the email. -->
    <div style="background-color: ${BRAND_COLOR}; border-radius: 12px; padding: 40px 24px; text-align: center; margin: 0 0 24px;">
      <div style="font-size: 48px; line-height: 1; margin: 0 0 12px;">&#127874;</div>
      <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #ffffff; line-height: 1.2;">
        Happy Birthday, ${name}!
      </h1>
      <p style="margin: 0; font-size: 15px; color: rgba(255,255,255,0.9); line-height: 1.5;">
        From everyone at Dermaspace &mdash; with love.
      </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 16px; color: #1c1e21; line-height: 1.6;">
      Hi ${name},
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: #1c1e21; line-height: 1.6;">
      Today is <strong>your</strong> day &mdash; and we couldn&rsquo;t let it go by without saying something.
      Thank you for trusting us with your skin, your wellness, and the little
      moments of self-care that keep you glowing all year round.
    </p>

    <p style="margin: 0 0 24px; font-size: 16px; color: #1c1e21; line-height: 1.6;">
      May this new year bring you softer skin, brighter mornings, quieter evenings,
      and every tiny thing you&rsquo;ve been wishing for. You deserve it.
    </p>

    <!-- Soft gift-card-style block. Not a hard promo — a warm invitation. -->
    <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px 24px; margin: 0 0 24px;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: ${BRAND_COLOR}; letter-spacing: 0.5px; text-transform: uppercase;">
        Your birthday treat
      </p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #1c1e21; line-height: 1.6;">
        Come celebrate with us this month. Book any treatment and our team will
        have a little surprise waiting for you &mdash; because you shouldn&rsquo;t have to
        ask for the good stuff on your birthday.
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <a href="${bookingUrl}" style="display: inline-block; padding: 12px 24px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; background-color: ${BRAND_COLOR}; border-radius: 6px;">
              Book your birthday visit
            </a>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 15px; color: #1c1e21; line-height: 1.6;">
      Wishing you the best year yet,<br>
      The Dermaspace family
    </p>
  `

  return sendEmail({
    to: data.email,
    subject: `Happy Birthday, ${name}! A little something from Dermaspace`,
    html: getEmailTemplate(content)
  })
}

// ---------------------------------------------------------------------------
// Welcome email — fired the moment a brand-new user verifies their email
// (or, if verification is skipped, immediately after signup). This is
// distinct from sendNewsletterWelcome (which is the marketing opt-in
// confirmation). The intent here is account onboarding: tell the new
// member what they can do next inside the product.
// ---------------------------------------------------------------------------
export async function sendWelcomeEmail(data: {
  email: string
  firstName: string
}): Promise<boolean> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.dermaspaceng.com'
  const bookingUrl = `${baseUrl}/booking`
  const dashboardUrl = `${baseUrl}/dashboard`
  const content = `
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 400; color: #1c1e21; line-height: 1.2;">
      Welcome to Dermaspace, ${data.firstName}.
    </h1>

    <p style="margin: 0 0 24px; font-size: 16px; color: #1c1e21; line-height: 1.6;">
      Your account is ready. We&apos;re thrilled to have you with us.
      Dermaspace is your home for considered skincare, calm wellness, and
      a team that genuinely cares about how you feel when you walk back
      out the door.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 24px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: ${BRAND_COLOR}; text-transform: uppercase; letter-spacing: 1px;">
            What you can do now
          </h3>
          <ul style="margin: 0; padding: 0 0 0 20px; color: #1c1e21; font-size: 14px; line-height: 1.8;">
            <li>Book a treatment at our Victoria Island or Ikoyi spa</li>
            <li>Chat with Derma AI for personalised skincare guidance</li>
            <li>Track your bookings, vouchers and gift cards in one place</li>
            <li>Reach a real Dermaspace representative anytime via live chat</li>
          </ul>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: ${BRAND_COLOR}; border-radius: 6px;">
          <a href="${bookingUrl}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Book your first appointment
          </a>
        </td>
        <td style="width: 12px;"></td>
        <td style="border: 1px solid #e5e5e5; border-radius: 6px;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #1c1e21; text-decoration: none;">
            Open dashboard
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 8px; font-size: 14px; color: #65676b; line-height: 1.6;">
      Questions? Just reply to this email or message us through the live
      chat in the app — a real person will pick it up.
    </p>

    <p style="margin: 24px 0 0; font-size: 14px; color: #1c1e21; line-height: 1.5;">
      With care,<br>
      The Dermaspace family
    </p>
  `

  return sendEmail({
    to: data.email,
    subject: `Welcome to Dermaspace, ${data.firstName}`,
    html: getEmailTemplate(content),
  })
}

// ---------------------------------------------------------------------------
// Live chat transcript — sent to the user (or guest) when they request a
// copy of their conversation, or automatically once a session closes.
// Ticket replies / follow-ups already have their own transcript-style
// emails (sendCustomerReplyAlert, sendStatusUpdateNotification); this
// is the live-chat equivalent.
// ---------------------------------------------------------------------------
export async function sendLiveChatTranscript(data: {
  email: string
  firstName: string
  sessionId: string
  staffName: string | null
  startedAt: string // human formatted
  endedAt: string | null // human formatted, null while still open
  messages: Array<{
    sender: 'user' | 'staff' | 'system'
    senderName: string | null
    body: string
    timestamp: string // human formatted, e.g. "12:34"
  }>
  resumeUrl?: string | null // signed link guests can use to come back
}): Promise<boolean> {
  // Render the message list as a table — Outlook hates floats / flex
  // and tables remain the safest bubble layout in HTML email.
  const bubbles = data.messages
    .map((m) => {
      if (m.sender === 'system') {
        return `
          <tr>
            <td style="padding: 6px 0; text-align: center;">
              <span style="display: inline-block; font-size: 11px; color: #65676b; background: #f0f2f5; padding: 4px 10px; border-radius: 999px;">
                ${escapeHtml(m.body)}
              </span>
            </td>
          </tr>`
      }
      const isStaff = m.sender === 'staff'
      const bg = isStaff ? '#f8f5fa' : '#7B2D8E'
      const fg = isStaff ? '#1c1e21' : '#ffffff'
      const align = isStaff ? 'left' : 'right'
      const label = isStaff
        ? m.senderName || 'Dermaspace'
        : 'You'
      return `
        <tr>
          <td style="padding: 6px 0; text-align: ${align};">
            <div style="display: inline-block; max-width: 78%; text-align: left;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #65676b;">
                <strong style="color:#1c1e21;">${escapeHtml(label)}</strong>
                &nbsp;·&nbsp;${escapeHtml(m.timestamp)}
              </p>
              <div style="background:${bg}; color:${fg}; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">
                ${escapeHtml(m.body)}
              </div>
            </div>
          </td>
        </tr>`
    })
    .join('')

  const headerLine = data.staffName
    ? `Your conversation with ${data.staffName}`
    : `Your conversation with the Dermaspace front desk`

  const resumeBlock = data.resumeUrl
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
        <tr>
          <td style="background-color: ${BRAND_COLOR}; border-radius: 6px;">
            <a href="${data.resumeUrl}" style="display: inline-block; padding: 12px 24px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
              Continue this chat
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 24px; font-size: 13px; color: #65676b; line-height: 1.5;">
        You can also reply to this email and a representative will follow
        up — please keep the subject line so we can match it to this
        conversation.
      </p>`
    : `
      <p style="margin: 0 0 24px; font-size: 14px; color: #1c1e21; line-height: 1.6;">
        Need anything else? Reply to this email and a Dermaspace
        representative will follow up directly.
      </p>`

  const content = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1c1e21; line-height: 1.2;">
      ${headerLine}
    </h1>
    <p style="margin: 0 0 20px; font-size: 13px; color: #65676b; line-height: 1.5;">
      Started ${escapeHtml(data.startedAt)}${data.endedAt ? ` · Ended ${escapeHtml(data.endedAt)}` : ''}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; color: #1c1e21; line-height: 1.6;">
      Hi ${escapeHtml(data.firstName)}, here&apos;s a copy of the conversation
      you had with our team. Keep this for your records.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${bubbles || '<tr><td style="padding: 12px 0; text-align: center; color: #65676b; font-size: 13px;">No messages were exchanged.</td></tr>'}
          </table>
        </td>
      </tr>
    </table>

    ${resumeBlock}

    <p style="margin: 0; font-size: 12px; color: #65676b; line-height: 1.5;">
      Reference: ${escapeHtml(data.sessionId)}
    </p>
  `

  return sendEmail({
    to: data.email,
    subject: `Your Dermaspace chat transcript`,
    html: getEmailTemplate(content),
  })
}

// ---------------------------------------------------------------------------
// Ticket transcript — sent on demand when the user clicks "Email me the
// full conversation" from a ticket detail page. Mirrors the live-chat
// transcript: a chronological list of messages plus a CTA back to the
// ticket so the customer can keep the thread going.
// ---------------------------------------------------------------------------
export async function sendTicketTranscript(data: {
  email: string
  firstName: string
  ticketId: string
  subject: string
  status: string
  createdAt: string
  messages: Array<{
    sender: 'user' | 'staff' | 'system'
    senderName: string | null
    body: string
    timestamp: string
  }>
}): Promise<boolean> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.dermaspaceng.com'
  const ticketUrl = `${baseUrl}/dashboard/tickets/${encodeURIComponent(data.ticketId)}`

  const bubbles = data.messages
    .map((m) => {
      if (m.sender === 'system') {
        return `
          <tr>
            <td style="padding: 6px 0; text-align: center;">
              <span style="display: inline-block; font-size: 11px; color: #65676b; background: #f0f2f5; padding: 4px 10px; border-radius: 999px;">
                ${escapeHtml(m.body)}
              </span>
            </td>
          </tr>`
      }
      const isStaff = m.sender === 'staff'
      const bg = isStaff ? '#f8f5fa' : '#7B2D8E'
      const fg = isStaff ? '#1c1e21' : '#ffffff'
      const align = isStaff ? 'left' : 'right'
      const label = isStaff
        ? m.senderName || 'Dermaspace Support'
        : 'You'
      return `
        <tr>
          <td style="padding: 6px 0; text-align: ${align};">
            <div style="display: inline-block; max-width: 78%; text-align: left;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #65676b;">
                <strong style="color:#1c1e21;">${escapeHtml(label)}</strong>
                &nbsp;·&nbsp;${escapeHtml(m.timestamp)}
              </p>
              <div style="background:${bg}; color:${fg}; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">
                ${escapeHtml(m.body)}
              </div>
            </div>
          </td>
        </tr>`
    })
    .join('')

  const content = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1c1e21; line-height: 1.2;">
      Ticket transcript
    </h1>
    <p style="margin: 0 0 20px; font-size: 13px; color: #65676b; line-height: 1.5;">
      ${escapeHtml(data.ticketId)} · ${escapeHtml(data.subject)} · Status: ${escapeHtml(data.status)} · Opened ${escapeHtml(data.createdAt)}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; color: #1c1e21; line-height: 1.6;">
      Hi ${escapeHtml(data.firstName)}, here is the full conversation on
      your support ticket. Keep this email for your records, or click the
      button below to continue the thread on the dashboard.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${bubbles}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 16px;">
      <tr>
        <td style="background-color: ${BRAND_COLOR}; border-radius: 6px;">
          <a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Open this ticket
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; color: #65676b; line-height: 1.5;">
      Reply to this email to add a follow-up message. Please keep the
      subject line so we can route it back to ticket
      <strong>${escapeHtml(data.ticketId)}</strong>.
    </p>
  `

  return sendEmail({
    to: data.email,
    subject: `Transcript for ticket ${data.ticketId}`,
    html: getEmailTemplate(content, {
      preheader: `A copy of your full conversation on ticket ${data.ticketId}.`,
      eyebrow: 'Ticket transcript',
      heroImage: `${PUBLIC_ORIGIN}/emails/hero-message.jpg`,
      heroAlt: 'Illustrated chat bubbles representing a support conversation',
    }),
  })
}

// ---------------------------------------------------------------------------
// Ticket RESOLVED → review-request email
// ---------------------------------------------------------------------------
// Sent the moment an admin marks a ticket `resolved`. Mirrors the
// post-resolution CSAT note Apple Support, Stripe, Linear, and Intercom
// drop into the customer's inbox: friendly headline, illustrated hero,
// inline 5-star strip (each star is its own tappable link that deep-links
// into the in-app review prompt with the rating pre-filled), short copy,
// and a primary "Leave a review" CTA. Critically, the email NEVER tries
// to capture the rating itself — clicking a star just opens the dashboard
// page, where the existing review component handles validation, edit,
// hover-headlines, and the optional comment. That keeps a single source
// of truth for the data and means the email looks delightful even when
// the customer's mail client strips form-style POST links.
export async function sendTicketResolvedReview(data: {
  email: string
  firstName: string
  ticketId: string
  subject: string
  resolverName?: string | null
}): Promise<boolean> {
  const ticketUrl = `${PUBLIC_ORIGIN}/dashboard/support/${encodeURIComponent(
    data.ticketId,
  )}`
  // Each star deep-links to the in-app review form with `?rating=N` so
  // the customer's first tap *is* their rating — the page just needs to
  // pre-select that value when it mounts. No data is stored from the
  // email click itself; the actual upsert still goes through the
  // authenticated /api/tickets/[ticketId]/review POST.
  const starLink = (n: number) =>
    `${ticketUrl}?rating=${n}#review`

  // Inline SVG stars render in every modern client (Gmail, Apple Mail,
  // Outlook 2019+, mobile clients) and let us keep the brand purple
  // without depending on a remote image. Filled = brand, empty = pale
  // lavender outline so the row reads as "tap to rate" instead of a
  // pre-decided score.
  const filledStar = `
    <svg width="34" height="34" viewBox="0 0 24 24" fill="#7B2D8E" xmlns="http://www.w3.org/2000/svg" style="display:block;">
      <path d="M12 2.5l2.95 6.18 6.8.86-5.02 4.7 1.32 6.74L12 17.77l-6.05 3.21 1.32-6.74L2.25 9.54l6.8-.86L12 2.5z" />
    </svg>`
  const emptyStar = `
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#7B2D8E" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg" style="display:block; opacity:0.45;">
      <path d="M12 2.5l2.95 6.18 6.8.86-5.02 4.7 1.32 6.74L12 17.77l-6.05 3.21 1.32-6.74L2.25 9.54l6.8-.86L12 2.5z" />
    </svg>`

  // Five tappable star cells. Each is its own anchor so big-inbox
  // clients (Gmail web, Apple Mail) hit-test on the star itself, not
  // the empty space around the row.
  const starRow = [1, 2, 3, 4, 5]
    .map(
      (n) => `
        <td align="center" style="padding: 0 6px;">
          <a href="${starLink(n)}" style="text-decoration:none;" aria-label="${n} star${n === 1 ? '' : 's'}">
            ${emptyStar}
          </a>
        </td>`,
    )
    .join('')

  const resolverLine = data.resolverName
    ? `${escapeHtml(data.resolverName)} on the Dermaspace team marked this ticket as resolved.`
    : 'Our team has marked this ticket as resolved.'

  const content = `
    <h1 style="margin: 0 0 12px; font-size: 22px; line-height: 1.25; font-weight: 700; color: #111827; letter-spacing: -0.01em;">
      How did we do, ${escapeHtml(data.firstName)}?
    </h1>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #374151;">
      ${resolverLine} If everything's sorted, a quick rating helps us learn what's working.
      If it's not, tap any star to reopen the conversation.
    </p>

    <!-- Ticket reference card. Mirrors the ticket-id pill on the
         in-app thread so this email feels like part of the same
         object, not a separate notification. -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 20px;">
      <tr>
        <td style="padding: 14px 16px; background-color: #FAF6FB; border: 1px solid #EFE5F4; border-radius: 12px;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #7B2D8E;">
            Ticket ${escapeHtml(data.ticketId)}
          </p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #111827; line-height: 1.4;">
            ${escapeHtml(data.subject || 'Your support ticket')}
          </p>
        </td>
      </tr>
    </table>

    <!-- Star strip. Padded generously so it reads as a deliberate
         widget rather than a row of icons crammed against the copy. -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 4px 0 14px;">
      <tr>
        <td align="center" style="padding: 18px 12px; background-color: #ffffff; border: 1px solid #EFE5F4; border-radius: 14px;">
          <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #6b7280;">
            Rate this resolution
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto;">
            <tr>
              ${starRow}
            </tr>
          </table>
          <p style="margin: 12px 0 0; font-size: 12px; color: #9ca3af;">
            Tap a star to leave a review · 1 = needs work · 5 = excellent
          </p>
        </td>
      </tr>
    </table>

    <!-- Primary CTA. Routes to the inline review form on the dashboard
         where the customer can also leave an optional comment. -->
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 6px 0 18px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 10px;">
          <a href="${ticketUrl}#review" style="display: inline-block; padding: 13px 26px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; line-height: 1;">
            Leave a review
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 6px; font-size: 13px; line-height: 1.6; color: #6b7280;">
      Not sorted yet? Just reply to this email and we'll reopen ticket
      <strong style="color:#111827;">${escapeHtml(data.ticketId)}</strong> right away —
      no need to start over.
    </p>
  `

  return sendEmail({
    to: data.email,
    subject: `How did we do? Rate ticket ${data.ticketId} - Dermaspace`,
    html: getEmailTemplate(content, {
      preheader: `Your ticket ${data.ticketId} is resolved. Tap a star to let us know how we did.`,
      eyebrow: 'Ticket resolved',
      heroImage: `${PUBLIC_ORIGIN}/emails/hero-resolved.jpg`,
      heroAlt: 'Illustrated support docket with a purple checkmark',
    }),
  })
}

// ---------------------------------------------------------------------------
// Booking RECEIPT email
// ---------------------------------------------------------------------------
// `sendBookingConfirmation` is the lightweight "we got your booking" note.
// `sendBookingReceipt` is the proper itemised receipt — sent the moment a
// booking flips to paid + confirmed, both for the wallet path and for the
// Paystack webhook. The on-page receipt at `/booking/[reference]` and the
// downloadable PDF use the same data shape, so the customer's inbox copy,
// the page they revisit, and the printed PDF all line up visually.
//
// Design decisions
// ----------------
//   * Hero band in the soft brand tint with the Dermaspace wordmark and a
//     RECEIPT pill on the right — mirrors the PDF letterhead so the email
//     feels like an extension of the receipt, not a different document.
//   * Itemised treatments table with the price right-aligned (the way
//     real receipts are read).
//   * Total card uses the brand purple as a solid fill. We avoid emoji
//     "celebration" glyphs (some of which render as boxes in older mail
//     clients) and rely on type weight + colour for the hierarchy.
//   * A "View receipt" button links back to the booking page so the
//     customer can re-download the PDF or share with a partner.
// ---------------------------------------------------------------------------
export async function sendBookingReceipt(data: {
  email: string
  customerName: string
  bookingReference: string
  appointmentDate: string // human-readable, e.g. "Saturday, 14 June 2025"
  appointmentTime: string // "15:00"
  locationName: string
  totalDurationMinutes: number
  services: Array<{
    treatmentName: string
    categoryName: string
    duration: number
    priceKobo: number
  }>
  subtotalKobo: number
  discountKobo: number
  voucherCode: string | null
  totalKobo: number
  paymentMethod: 'wallet' | 'paystack' | null
  paymentReference: string | null
}): Promise<boolean> {
  const firstName = (data.customerName || '').split(' ')[0] || 'there'
  const issued = new Date().toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dermaspaceng.com'
  const receiptUrl = `${appUrl}/booking/${encodeURIComponent(data.bookingReference)}`

  const itemsHtml = data.services
    .map(
      (s, i) => `
        <tr style="background-color: ${i % 2 === 1 ? '#fbfaff' : '#ffffff'};">
          <td style="padding: 14px 16px; border-bottom: 1px solid #f0eef5;">
            <div style="font-size: 14px; font-weight: 600; color: #18181b;">${escapeHtml(
              s.treatmentName,
            )}</div>
            <div style="font-size: 12px; color: #787a82; margin-top: 2px;">
              ${escapeHtml(s.categoryName)} &middot; ${s.duration} min
            </div>
          </td>
          <td style="padding: 14px 16px; border-bottom: 1px solid #f0eef5; text-align: right; font-size: 14px; font-weight: 600; color: #18181b; white-space: nowrap;">
            ${fmtNairaForEmail(s.priceKobo)}
          </td>
        </tr>`,
    )
    .join('')

  const breakdownHtml =
    data.discountKobo > 0
      ? `
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #787a82;">Subtotal</td>
          <td style="padding: 6px 0; font-size: 13px; color: #4a4a4a; text-align: right;">${fmtNairaForEmail(
            data.subtotalKobo,
          )}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: ${BRAND_COLOR};">Voucher${
            data.voucherCode ? ` &middot; ${escapeHtml(data.voucherCode)}` : ''
          }</td>
          <td style="padding: 6px 0; font-size: 13px; color: ${BRAND_COLOR}; text-align: right;">- ${fmtNairaForEmail(
            data.discountKobo,
          )}</td>
        </tr>`
      : ''

  const paymentMetaHtml = (() => {
    const lines: string[] = []
    if (data.paymentMethod) {
      lines.push(`Paid via ${escapeHtml(data.paymentMethod)}`)
    }
    if (data.paymentReference) {
      lines.push(
        `Ref <span style="font-family: 'Courier New', monospace;">${escapeHtml(
          data.paymentReference,
        )}</span>`,
      )
    }
    if (!lines.length) return ''
    return `
      <p style="margin: 12px 0 0; font-size: 12px; color: rgba(255,255,255,0.85); text-align: right;">
        ${lines.join(' &middot; ')}
      </p>`
  })()

  const content = `
    <!-- Hero band -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3e9f8; border-radius: 16px; margin: 0 0 24px;">
      <tr>
        <td style="padding: 22px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align: middle;">
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 700; color: ${BRAND_COLOR}; letter-spacing: -0.4px;">Dermaspace</div>
                <div style="font-size: 11px; color: #787a82; margin-top: 2px; letter-spacing: 0.5px;">ESTHETIC &amp; WELLNESS CENTRE</div>
              </td>
              <td style="vertical-align: middle; text-align: right;">
                <div style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; padding: 7px 16px; border-radius: 999px;">RECEIPT</div>
                <div style="font-size: 11px; color: #787a82; margin-top: 8px;">Issued ${issued}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Salute -->
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #18181b; letter-spacing: -0.3px;">
      Hi ${escapeHtml(firstName)}, you&rsquo;re booked.
    </h2>
    <p style="margin: 0 0 24px; font-size: 14px; color: #4a4a4a; line-height: 1.6;">
      Here&rsquo;s the receipt for your appointment. Save it for your records or share it with whoever&rsquo;s coming with you.
    </p>

    <!-- Reference / status -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="vertical-align: top;">
          <div style="font-size: 10px; font-weight: 600; color: #787a82; letter-spacing: 1.4px;">BOOKING REFERENCE</div>
          <div style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: ${BRAND_COLOR}; margin-top: 4px;">
            ${escapeHtml(data.bookingReference)}
          </div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <div style="font-size: 10px; font-weight: 600; color: #787a82; letter-spacing: 1.4px;">STATUS</div>
          <div style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-top: 4px;">Confirmed</div>
        </td>
      </tr>
    </table>

    <!-- Appointment details -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #ececf2; border-radius: 12px; margin: 0 0 24px;">
      <tr>
        <td style="padding: 18px 20px; border-bottom: 1px solid #f0eef5;">
          <div style="font-size: 10px; font-weight: 600; color: #787a82; letter-spacing: 1.4px;">DATE</div>
          <div style="font-size: 14px; font-weight: 600; color: #18181b; margin-top: 4px;">${escapeHtml(
            data.appointmentDate,
          )}</div>
        </td>
        <td style="padding: 18px 20px; border-bottom: 1px solid #f0eef5; border-left: 1px solid #f0eef5;">
          <div style="font-size: 10px; font-weight: 600; color: #787a82; letter-spacing: 1.4px;">TIME</div>
          <div style="font-size: 14px; font-weight: 600; color: #18181b; margin-top: 4px;">${escapeHtml(
            data.appointmentTime,
          )}</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 18px 20px;">
          <div style="font-size: 10px; font-weight: 600; color: #787a82; letter-spacing: 1.4px;">LOCATION</div>
          <div style="font-size: 14px; font-weight: 600; color: #18181b; margin-top: 4px;">${escapeHtml(
            data.locationName,
          )}</div>
        </td>
        <td style="padding: 18px 20px; border-left: 1px solid #f0eef5;">
          <div style="font-size: 10px; font-weight: 600; color: #787a82; letter-spacing: 1.4px;">DURATION</div>
          <div style="font-size: 14px; font-weight: 600; color: #18181b; margin-top: 4px;">${data.totalDurationMinutes} minutes</div>
        </td>
      </tr>
    </table>

    <!-- Treatments -->
    <div style="margin: 0 0 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="font-size: 11px; font-weight: 700; color: ${BRAND_COLOR}; letter-spacing: 1.4px;">TREATMENTS</td>
          <td style="font-size: 11px; color: #787a82; text-align: right;">
            ${data.services.length} ${data.services.length === 1 ? 'item' : 'items'}
          </td>
        </tr>
      </table>
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #ececf2; border-radius: 12px; overflow: hidden; margin: 0 0 16px;">
      ${itemsHtml}
    </table>

    ${
      breakdownHtml
        ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 8px;">${breakdownHtml}</table>`
        : ''
    }

    <!-- Total card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND_COLOR}; border-radius: 14px; margin: 0 0 24px;">
      <tr>
        <td style="padding: 20px 22px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align: middle;">
                <div style="font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.8); letter-spacing: 1.4px;">TOTAL PAID</div>
                <div style="font-size: 28px; font-weight: 700; color: #ffffff; margin-top: 6px; letter-spacing: -0.5px;">${fmtNairaForEmail(
                  data.totalKobo,
                )}</div>
              </td>
              <td style="vertical-align: middle; text-align: right;">
                ${paymentMetaHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
      <tr>
        <td align="center">
          <a href="${receiptUrl}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 13px 28px; border-radius: 10px;">
            View receipt &amp; download PDF
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #787a82; line-height: 1.6; text-align: center;">
      Need to reschedule? Reply to this email or message us at least 24 hours before your slot.<br>
      We can&rsquo;t wait to host you at Dermaspace.
    </p>
  `

  return sendEmail({
    to: data.email,
    subject: `Receipt for booking ${data.bookingReference} \u00B7 Dermaspace`,
    html: getEmailTemplate(content),
  })
}
