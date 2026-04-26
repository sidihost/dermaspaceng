import { Metadata } from "next"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import LegalShell, { type LegalSection } from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Dermaspace's website, app, treatments, gift cards, wallet and Derma AI assistant. Lagos, Nigeria.",
  alternates: { canonical: "https://dermaspaceng.com/terms" },
  openGraph: {
    title: "Terms of Service | Dermaspace",
    description:
      "The contract between you and Dermaspace when you use our website, mobile app, treatments and Derma AI assistant.",
    url: "https://dermaspaceng.com/terms",
    type: "article",
  },
  robots: { index: true, follow: true },
}

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    content: (
      <>
        <p>
          These Terms of Service form a binding agreement between you and{" "}
          <strong>Dermaspace Esthetic & Wellness Centre Ltd</strong>, a company
          registered in Nigeria, with locations at 237B Muri Okunola Street,
          Victoria Island, Lagos, and 44A Awolowo Road, Ikoyi, Lagos.
        </p>
        <p>
          By creating an account, booking a treatment, redeeming a gift card,
          using our wallet, sending messages through Derma AI, or otherwise
          interacting with our website or progressive web app, you agree to be
          bound by these terms together with our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    content: (
      <>
        <p>
          You must be at least 18 years old, or have the consent of a parent or
          legal guardian, to use our services. You must provide accurate
          contact information so we can confirm bookings, deliver gift cards
          and reach you in the event of a treatment-related issue.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    content: (
      <>
        <ul>
          <li>
            You are responsible for keeping your password and any 2FA codes
            confidential and for all activity that takes place under your
            account.
          </li>
          <li>
            We may suspend or close accounts that violate these terms, abuse
            our wallet, gift card or referral systems, or jeopardise the
            safety of our staff or other clients.
          </li>
          <li>
            You can close your account at any time from{" "}
            <a href="/dashboard/settings">Dashboard → Settings</a>.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "bookings",
    title: "Bookings & cancellations",
    content: (
      <>
        <ul>
          <li>
            All appointments are subject to availability. A booking is only
            confirmed once you receive a confirmation email or in-app
            notification.
          </li>
          <li>
            We require at least 12 hours&apos; notice to cancel or reschedule a
            paid appointment. Cancellations made with less notice may forfeit
            the deposit.
          </li>
          <li>
            We may need to reschedule an appointment in rare cases (illness of
            the assigned therapist, equipment downtime, local emergencies).
            Where this happens we will offer the next available slot at no
            extra cost or refund the deposit in full.
          </li>
          <li>
            Arriving more than 15 minutes late may shorten your treatment to
            avoid impacting subsequent guests.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "payments",
    title: "Payments, wallet & gift cards",
    content: (
      <>
        <ul>
          <li>
            Prices are quoted in Nigerian Naira (₦) and are inclusive of any
            applicable VAT unless stated otherwise.
          </li>
          <li>
            The Dermaspace wallet is a stored-value tool used to pay for
            services on this website and at our locations. Wallet balances are
            non-transferable, non-interest-bearing, and cannot be redeemed for
            cash except where required by law.
          </li>
          <li>
            Gift cards are valid for 12 months from purchase, are
            non-refundable, and can be redeemed in part or in full against any
            service.
          </li>
          <li>
            Payment failures, chargebacks or fraudulent transactions may lead
            to immediate suspension of the related booking and account.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "treatments",
    title: "Treatments & medical disclaimer",
    content: (
      <>
        <p>
          Our therapists, estheticians and laser technicians are
          internationally certified, but Dermaspace is a wellness and esthetic
          centre — <strong>we are not a hospital</strong>. Our services are
          intended to enhance skin health and wellbeing and do not replace
          medical advice, diagnosis or treatment from a qualified physician.
        </p>
        <ul>
          <li>
            Please disclose all known allergies, medications, pregnancies and
            recent medical procedures during your consultation. Failure to do
            so may compromise your safety.
          </li>
          <li>
            We may decline a treatment that we believe is unsuitable for you
            on safety grounds.
          </li>
          <li>
            Results vary between individuals. Where outcomes are mentioned in
            marketing material, they reflect typical results — not guarantees.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "derma-ai",
    title: "Use of Derma AI",
    content: (
      <>
        <p>
          Derma AI is our virtual concierge built on top of carefully selected
          large language models. By using Derma AI you also agree to our
          dedicated{" "}
          <a href="/blog/derma-ai-terms">
            Derma AI Terms &amp; Acceptable Use document
          </a>
          , which sets out:
        </p>
        <ul>
          <li>What Derma AI can and cannot do.</li>
          <li>
            Why its outputs are recommendations only and never a substitute
            for a qualified medical opinion.
          </li>
          <li>
            How transcripts, images and audio are stored, reviewed and
            deleted.
          </li>
          <li>Acceptable-use rules around abuse, prompt injection and PII.</li>
        </ul>
      </>
    ),
  },
  {
    id: "user-content",
    title: "Your content",
    content: (
      <>
        <p>
          When you submit reviews, feedback, photographs or other content
          through our site or Derma AI, you grant Dermaspace a worldwide,
          royalty-free, non-exclusive licence to host, display and use that
          content for the purpose of operating and promoting our services. You
          retain ownership of your content and can request its removal at any
          time.
        </p>
        <p>
          You agree not to submit content that is unlawful, defamatory,
          infringing, harmful, sexually explicit, or that contains malware or
          spam.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    content: (
      <>
        <p>
          The Dermaspace name, butterfly mark, logos, photographs, video,
          editorial copy, code and design system are owned by Dermaspace
          Esthetic & Wellness Centre Ltd or its licensors. You may not copy,
          mirror, reverse-engineer or build derivative products from this site
          without our written consent.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <>
        <p>
          To the fullest extent permitted by Nigerian law, Dermaspace and its
          directors, staff, contractors and partners are not liable for any
          indirect, incidental, special, consequential or punitive damages,
          including loss of profits, data or goodwill, arising out of your
          use of our services.
        </p>
        <p>
          Our total aggregate liability for any claim arising out of these
          terms is limited to the amount you actually paid Dermaspace in the
          twelve (12) months preceding the event giving rise to the claim.
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
    id: "indemnity",
    title: "Indemnity",
    content: (
      <>
        <p>
          You agree to indemnify Dermaspace against any losses arising from
          your breach of these terms, your misuse of the site or our services,
          or your violation of another party&apos;s rights.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    content: (
      <>
        <p>
          We may suspend or terminate your access at any time if you breach
          these terms, abuse our products, or engage in conduct that we deem
          harmful to other clients or staff. You may stop using our services
          at any time by closing your account.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    content: (
      <>
        <p>
          These terms are governed by the laws of the Federal Republic of
          Nigeria. Any dispute arising under or in connection with them will be
          subject to the exclusive jurisdiction of the courts of Lagos State,
          Nigeria, except that we may seek injunctive relief in any court of
          competent jurisdiction to protect our intellectual property or the
          security of our systems.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    content: (
      <>
        <p>
          We may update these Terms of Service from time to time. We will
          announce material changes on this page and, where appropriate, by
          email or push notification before they take effect. Continued use of
          our services after a change indicates your acceptance of the
          updated terms.
        </p>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <main>
      <Header />
      <LegalShell
        kicker="Legal"
        title="Terms of Service"
        subtitle="The rules of the road when you book a treatment, top up your wallet, redeem a gift card, or chat with Derma AI."
        lastUpdated="April 26, 2026"
        effectiveDate="April 26, 2026"
        intro={
          <p>
            We&apos;ve done our best to keep this document short and readable.
            If anything below is unclear, please reach out to{" "}
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
