import { Metadata } from "next"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import LegalShell, { type LegalSection } from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Dermaspace Esthetic & Wellness Centre collects, uses and protects your personal data — including data processed by our Derma AI assistant. NDPA-aligned.",
  alternates: { canonical: "https://dermaspaceng.com/privacy" },
  openGraph: {
    title: "Privacy Policy | Dermaspace",
    description:
      "How Dermaspace handles your personal data, your rights under Nigeria's NDPA, and how Derma AI processes consultation conversations.",
    url: "https://dermaspaceng.com/privacy",
    type: "article",
  },
  robots: { index: true, follow: true },
}

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Scope of this policy",
    content: (
      <>
        <p>
          This Privacy Policy explains how Dermaspace Esthetic & Wellness Centre
          Ltd (&quot;<strong>Dermaspace</strong>&quot;, &quot;we&quot;,
          &quot;us&quot;) collects, uses, stores and shares the personal data of
          visitors and clients who interact with us in person at our Victoria
          Island and Ikoyi locations, on our website{" "}
          <a href="https://dermaspaceng.com">dermaspaceng.com</a>, in our
          progressive web app, and through our Derma AI virtual assistant.
        </p>
        <p>
          We are a Nigerian company and our processing of personal data is
          governed by the Nigeria Data Protection Act 2023 (NDPA) and any
          applicable subsidiary regulations issued by the Nigeria Data
          Protection Commission (NDPC).
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "Data we collect",
    content: (
      <>
        <h3>Information you give us</h3>
        <ul>
          <li>
            <strong>Account details</strong> — name, email, phone number, date
            of birth, gender, and password hash when you create an account.
          </li>
          <li>
            <strong>Booking & consultation data</strong> — services chosen,
            preferred location, skin and wellness concerns, allergies, and
            relevant medical history you choose to disclose.
          </li>
          <li>
            <strong>Payment data</strong> — wallet top-ups, gift card requests,
            and transaction references. Card numbers are processed by our
            payment partners (e.g. Paystack) and never stored on our servers.
          </li>
          <li>
            <strong>Communications</strong> — messages sent through contact
            forms, complaints, feedback surveys and Derma AI conversations.
          </li>
        </ul>

        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Device & usage data</strong> — IP address, device type,
            browser, pages viewed, referring URL, approximate location
            (city-level) and time-stamps of activity.
          </li>
          <li>
            <strong>Cookies & similar technologies</strong> — see our cookie
            section below.
          </li>
          <li>
            <strong>Push notification tokens</strong> — when you opt in to
            appointment reminders or admin announcements.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your data",
    content: (
      <>
        <p>We process your personal data on the following lawful bases:</p>
        <ul>
          <li>
            <strong>Performance of a contract</strong> — to schedule and
            deliver treatments you have booked, process payments, manage
            wallets and gift cards, and provide customer support.
          </li>
          <li>
            <strong>Legitimate interest</strong> — to keep our website secure
            (rate-limiting, fraud prevention), improve our services, and
            measure aggregate usage.
          </li>
          <li>
            <strong>Consent</strong> — to send marketing emails, push
            notifications, location-aware banners and to operate Derma AI
            voice/video sessions.
          </li>
          <li>
            <strong>Legal obligation</strong> — to retain records required for
            accounting, tax and health-and-safety regulations.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "derma-ai",
    title: "Derma AI assistant",
    content: (
      <>
        <p>
          Derma AI is our in-app virtual concierge. When you chat, speak or
          share images with Derma AI we collect the message contents and any
          attached media in order to answer your question and recommend
          relevant treatments.
        </p>
        <ul>
          <li>
            Conversation transcripts are stored against your account so you can
            review prior chats and we can resume context. You can delete a
            conversation at any time from the Derma AI panel.
          </li>
          <li>
            Snippets of conversation may be reviewed by trained staff to
            improve the assistant&apos;s quality. We never associate reviewed
            snippets with marketing profiles.
          </li>
          <li>
            Derma AI is a wellness tool — <strong>not</strong> a medical
            device. Recommendations do not replace consultation with a
            qualified physician. See our separate{" "}
            <a href="/blog/derma-ai-terms">Derma AI Terms &amp; Acceptable Use</a>{" "}
            for the full ground rules.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "sharing",
    title: "How we share your data",
    content: (
      <>
        <p>We share personal data only with carefully selected partners:</p>
        <ul>
          <li>
            <strong>Hosting & infrastructure</strong> — Vercel (web hosting),
            Neon (database), Vercel Blob (file storage). Data may be processed
            in the EU and US under standard data-protection clauses.
          </li>
          <li>
            <strong>Communications</strong> — email and SMS providers used to
            deliver booking confirmations, OTPs and reminders.
          </li>
          <li>
            <strong>Payments</strong> — Paystack and other licensed payment
            processors for card and bank transactions.
          </li>
          <li>
            <strong>Analytics</strong> — Google Tag Manager, Vercel Analytics
            and self-hosted Umami in aggregate, anonymised form.
          </li>
          <li>
            <strong>AI providers</strong> — Groq and Mistral for natural
            language understanding inside Derma AI. We do not allow these
            providers to use your conversations to train their general models.
          </li>
        </ul>
        <p>
          We never sell your personal data. We disclose data to law enforcement
          only when legally compelled by a valid Nigerian court order or
          equivalent process.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    content: (
      <>
        <ul>
          <li>
            <strong>Account data</strong> — kept for as long as your account is
            active. Deleting your account removes profile data within 30 days,
            except records we are legally required to retain.
          </li>
          <li>
            <strong>Booking & treatment records</strong> — kept for 7 years
            after your last visit to comply with health and tax regulations.
          </li>
          <li>
            <strong>Marketing consent records</strong> — kept until you opt
            out, plus 12 months for proof of consent.
          </li>
          <li>
            <strong>Derma AI transcripts</strong> — kept for 12 months unless
            you delete them sooner.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect your data",
    content: (
      <>
        <ul>
          <li>All traffic is served over HTTPS (TLS 1.2+).</li>
          <li>
            Passwords are hashed with bcrypt; we never store passwords in
            plaintext.
          </li>
          <li>
            Sessions use HTTP-only, secure cookies with a 30-day expiry and
            device-binding.
          </li>
          <li>
            Two-factor authentication and passkeys are available to all
            accounts.
          </li>
          <li>
            Database access is limited to a small number of vetted engineers
            and audit-logged.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    content: (
      <>
        <p>
          Under the NDPA you have the right to access, correct, port, delete or
          object to the processing of your personal data, and to withdraw
          consent at any time. To exercise these rights, email{" "}
          <a href="mailto:info@dermaspaceng.com">info@dermaspaceng.com</a> with
          the subject line &quot;Data request&quot;. We will respond within 30
          days.
        </p>
        <p>
          You also have the right to lodge a complaint with the Nigeria Data
          Protection Commission at{" "}
          <a href="https://ndpc.gov.ng" target="_blank" rel="noreferrer">
            ndpc.gov.ng
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies & tracking",
    content: (
      <>
        <p>
          We use a small number of strictly-necessary cookies (session, CSRF,
          consent state) and, with your consent, analytics cookies that help us
          understand how the site is used. You can clear cookies through your
          browser at any time; doing so will sign you out of the site.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <>
        <p>
          Our services are intended for adults aged 18 and above. Bookings for
          minors must be made by a parent or guardian who provides consent on
          their behalf. We do not knowingly collect personal data from
          children.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time. Material changes
          will be announced on this page and, where appropriate, by email or
          push notification before they take effect.
        </p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <main>
      <Header />
      <LegalShell
        kicker="Legal"
        title="Privacy Policy"
        subtitle="How Dermaspace handles your personal data — including everything you share with our staff, our website, and our Derma AI assistant."
        lastUpdated="April 26, 2026"
        effectiveDate="April 26, 2026"
        intro={
          <p>
            Your privacy matters to us. This document is written in plain
            English wherever possible so you can understand exactly what we
            collect and why. If anything is unclear, please contact us at{" "}
            <a href="mailto:info@dermaspaceng.com">info@dermaspaceng.com</a>.
          </p>
        }
        sections={sections}
      />
      <Footer />
    </main>
  )
}
