import { Metadata } from "next"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import LegalShell, { type LegalSection } from "@/components/legal/legal-shell"

// ---------------------------------------------------------------------------
// Derma AI Terms & Acceptable Use
//
// This is the dedicated companion document referenced by /privacy and
// /terms. It used to be linked at /blog/derma-ai-terms, which was wrong
// for two reasons: (1) it isn't editorial content, it's a legal
// agreement, and (2) the blog page didn't actually exist, leaving
// users with a 404 from two different policy pages. Putting it at a
// top-level /derma-ai-terms route fixes both — it lives next to the
// other legal documents and uses the shared LegalShell so it inherits
// the same TOC, scroll-spy and contact-card chrome.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Derma AI Terms & Acceptable Use",
  description:
    "The ground rules for using Derma AI — Dermaspace's virtual concierge. What it can do, what it can't, how your conversations are stored, and how to use it safely.",
  alternates: { canonical: "https://dermaspaceng.com/derma-ai-terms" },
  openGraph: {
    title: "Derma AI Terms & Acceptable Use | Dermaspace",
    description:
      "What Derma AI is, what it isn't, and how to use it safely and respectfully.",
    url: "https://dermaspaceng.com/derma-ai-terms",
    type: "article",
  },
  robots: { index: true, follow: true },
}

const sections: LegalSection[] = [
  {
    id: "what-is-derma-ai",
    title: "What Derma AI is",
    content: (
      <>
        <p>
          Derma AI is the virtual concierge built into the Dermaspace website
          and app. It can answer questions about our treatments and locations,
          recommend services based on your skin and wellness concerns, help
          you book or reschedule appointments, top up your wallet, redeem gift
          cards, and pass complex requests to a human team-mate when needed.
        </p>
        <p>
          Behind the scenes Derma AI is powered by carefully selected
          large-language models, retrieval over our own knowledge base, and a
          set of secure tools that let it perform actions on your behalf when
          you ask it to. It runs on infrastructure operated by{" "}
          <strong>Imoogle Technology</strong>, our technology partner, under
          contractual data-protection commitments.
        </p>
      </>
    ),
  },
  {
    id: "what-it-isnt",
    title: "What Derma AI is not",
    content: (
      <>
        <p>
          Derma AI is a wellness and concierge tool. It is{" "}
          <strong>not</strong>:
        </p>
        <ul>
          <li>
            <strong>A medical device or licensed clinician.</strong> It cannot
            diagnose conditions, prescribe medication, or replace a
            consultation with a qualified physician or dermatologist.
          </li>
          <li>
            <strong>An emergency service.</strong> If you are experiencing a
            medical emergency, severe allergic reaction, or a mental-health
            crisis, contact emergency services or a qualified professional
            immediately. Do not rely on Derma AI.
          </li>
          <li>
            <strong>A general-purpose chatbot.</strong> Derma AI is scoped to
            skin, body, wellness and Dermaspace-specific topics. Off-topic
            questions may be politely declined.
          </li>
          <li>
            <strong>Infallible.</strong> Like all AI systems, Derma AI can be
            wrong, out of date, or miss nuance. Always confirm anything
            important with our human team before acting on it.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "recommendations",
    title: "Recommendations are guidance, not prescriptions",
    content: (
      <>
        <p>
          When Derma AI suggests a treatment, product or routine, that
          recommendation is informational. It reflects the patterns it has
          learned from our service catalogue, public skincare literature and
          your conversation — not a personalised medical opinion.
        </p>
        <ul>
          <li>
            Always disclose allergies, medications, pregnancy, recent surgical
            procedures and pre-existing skin conditions to a human therapist
            during your in-clinic consultation, even if you have already
            mentioned them to Derma AI.
          </li>
          <li>
            Patch tests, professional consultations and qualified medical
            advice always take precedence over anything Derma AI says.
          </li>
          <li>
            If Derma AI ever suggests something that contradicts advice from
            your doctor or dermatologist, follow your doctor.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-data",
    title: "How your conversations are handled",
    content: (
      <>
        <p>
          When you chat, speak or share images with Derma AI, we collect the
          contents of those interactions to deliver a useful answer and to
          maintain context across the conversation. The full details live in
          our <a href="/privacy">Privacy Policy</a>, but the headline
          commitments are:
        </p>
        <ul>
          <li>
            <strong>Stored against your account.</strong> Transcripts are
            saved so you can resume past chats. You can delete a conversation
            at any time from the Derma AI panel.
          </li>
          <li>
            <strong>Default retention is 12 months.</strong> Older transcripts
            are deleted unless you have already removed them or law requires
            us to retain them for longer.
          </li>
          <li>
            <strong>Quality reviews.</strong> Trained Dermaspace staff may
            review snippets of conversations to improve the assistant&apos;s
            quality and safety. Reviewed snippets are never used for marketing
            profiling.
          </li>
          <li>
            <strong>No third-party model training.</strong> We contractually
            prohibit our AI providers from using your conversations to train
            their general models.
          </li>
          <li>
            <strong>Sensitive data is minimised.</strong> Avoid sharing
            government IDs, full payment-card numbers or other unnecessary
            identifying information in chat. Derma AI does not need that
            information to help you book or pay — those flows are handled by
            secure forms.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "actions",
    title: "Actions Derma AI can perform on your behalf",
    content: (
      <>
        <p>
          When you ask, Derma AI can take actions on your account — for
          example creating a booking, topping up your wallet, redeeming a
          gift card, opening a support ticket, or saving a preference. By
          using these features you confirm that:
        </p>
        <ul>
          <li>
            You authorise Derma AI to perform the requested action on your
            account using the credentials of the signed-in session.
          </li>
          <li>
            You have reviewed the summary that Derma AI shows before
            confirming an action that costs money or changes account-level
            settings.
          </li>
          <li>
            You will report any unexpected action to{" "}
            <a href="mailto:security@dermaspaceng.com">
              security@dermaspaceng.com
            </a>{" "}
            promptly so we can investigate.
          </li>
        </ul>
        <p>
          Wallet, payment, gift-card and booking rules from our main{" "}
          <a href="/terms">Terms of Service</a> apply in full to actions taken
          via Derma AI.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>
          Derma AI is a tool for our clients, our staff and our community.
          Please do not:
        </p>
        <ul>
          <li>
            Use Derma AI to harass, threaten or impersonate another person.
          </li>
          <li>
            Submit content that is unlawful, sexually explicit, hateful,
            graphic, or otherwise inappropriate.
          </li>
          <li>
            Attempt prompt injection, jailbreaks, or any technique designed
            to make Derma AI ignore its instructions, leak private data, or
            perform unauthorised actions.
          </li>
          <li>
            Try to extract our system prompts, internal tooling, or other
            proprietary information.
          </li>
          <li>
            Submit personal data of other people without their permission.
          </li>
          <li>
            Use Derma AI to scrape, mirror or compete with Dermaspace, or to
            build a competing assistant.
          </li>
          <li>
            Rely on Derma AI for medical, legal, financial or emergency
            decisions.
          </li>
        </ul>
        <p>
          We may rate-limit, suspend or revoke access to Derma AI for any
          account that breaches these rules, and we may disclose serious
          abuse to law enforcement where appropriate.
        </p>
      </>
    ),
  },
  {
    id: "voice-and-images",
    title: "Voice, video and image inputs",
    content: (
      <>
        <ul>
          <li>
            Voice and video sessions only start when you explicitly tap to
            begin them. Audio and video are processed for the duration of the
            session and short-lived recordings may be retained for up to 24
            hours for safety review before being deleted.
          </li>
          <li>
            Images you upload (e.g. a photograph of a skin concern) are
            stored with your transcript so the assistant can refer back to
            them. You can delete them with the rest of the conversation.
          </li>
          <li>
            Do not upload images that contain other people without their
            consent, or images of minors.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes",
    content: (
      <>
        <p>
          We work hard to keep Derma AI available, but it may be paused,
          rate-limited, or temporarily unavailable for maintenance, model
          upgrades, or safety reasons. We may also change which model powers
          Derma AI, the actions it can perform, or these terms — material
          changes will be announced on this page.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    content: (
      <>
        <p>
          Derma AI is provided &quot;as is&quot;. To the fullest extent
          permitted by Nigerian law, Dermaspace and Imoogle Technology are
          not liable for indirect, incidental, special, consequential or
          punitive damages arising from your use of Derma AI, including
          decisions you make based on its outputs. Our overall liability is
          capped as described in our main{" "}
          <a href="/terms">Terms of Service</a>.
        </p>
        <p>
          Nothing in these terms excludes liability for death or personal
          injury caused by our negligence or for fraud, where such limitation
          is not permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Questions, complaints, data requests",
    content: (
      <>
        <p>
          For privacy and data requests email{" "}
          <a href="mailto:info@dermaspaceng.com">info@dermaspaceng.com</a>.
          For security reports email{" "}
          <a href="mailto:security@dermaspaceng.com">
            security@dermaspaceng.com
          </a>
          . For general feedback about Derma AI use the{" "}
          <a href="/feedback">feedback page</a> or shake your phone while
          inside the assistant.
        </p>
      </>
    ),
  },
]

export default function DermaAITermsPage() {
  return (
    <main>
      <Header />
      <LegalShell
        kicker="Derma AI"
        title="Derma AI Terms & Acceptable Use"
        subtitle="The ground rules for using Derma AI — what it can do, what it can't, and how your conversations are handled."
        lastUpdated="April 26, 2026"
        effectiveDate="April 26, 2026"
        intro={
          <p>
            These terms apply alongside our main{" "}
            <a href="/terms">Terms of Service</a> and{" "}
            <a href="/privacy">Privacy Policy</a>. By using Derma AI you
            confirm you&apos;ve read this document and accept its rules. If
            anything below is unclear, please contact us at{" "}
            <a href="mailto:info@dermaspaceng.com">info@dermaspaceng.com</a>{" "}
            before continuing.
          </p>
        }
        sections={sections}
      />
      <Footer />
    </main>
  )
}
