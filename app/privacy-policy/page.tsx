export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-bold text-3xl">Privacy Policy</h1>
      <p className="mb-8 text-gray-600 text-sm">
        Last updated: October 6, 2025
      </p>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">1. Introduction</h2>
        <p>
          At LedgerBot ("we," "us," or "our"), we are committed to protecting
          your privacy. This Privacy Policy explains how we collect, use,
          disclose, and safeguard your information when you use our AI-powered
          chatbot service at ledgerbot.co.
        </p>
        <p>
          By using our Service, you agree to the collection and use of
          information in accordance with this policy.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">
          2. Information We Collect
        </h2>
        <p>We collect the following types of information:</p>
        <ul className="ml-4 list-inside list-disc">
          <li>
            <strong>Personal Information:</strong> Name, email, and other
            details provided during registration via Clerk authentication.
          </li>
          <li>
            <strong>Content Data:</strong> Chat messages, documents you create
            or upload, and AI-generated responses.
          </li>
          <li>
            <strong>Usage Data:</strong> Information about how you interact with
            the Service, including features used and time spent.
          </li>
          <li>
            <strong>Technical Data:</strong> IP address, browser type, device
            information, and cookies.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">
          3. How We Use Your Information
        </h2>
        <p>We use your information to:</p>
        <ul className="ml-4 list-inside list-disc">
          <li>Provide and maintain the Service</li>
          <li>Process AI requests and generate responses</li>
          <li>Improve our AI models and service features</li>
          <li>Analyze usage patterns and perform analytics</li>
          <li>Communicate with you about the Service</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">
          4. How We Share Your Information
        </h2>
        <p>We may share your information in the following circumstances:</p>
        <ul className="ml-4 list-inside list-disc">
          <li>
            With service providers (e.g., Clerk for authentication, AI providers
            for processing)
          </li>
          <li>When required by law or to protect our rights</li>
          <li>In connection with a business transfer or merger</li>
          <li>With your consent</li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">5. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to
          protect your information, including encryption, access controls, and
          regular security assessments. However, no method of transmission over
          the internet is 100% secure.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">6. Your Rights</h2>
        <p>Under Australian privacy laws, you have the right to:</p>
        <ul className="ml-4 list-inside list-disc">
          <li>Access your personal information</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your data</li>
          <li>Object to processing in certain circumstances</li>
          <li>Data portability</li>
        </ul>
        <p>To exercise these rights, contact us at support@ledgerbot.co.</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">
          7. Cookies and Tracking Technologies
        </h2>
        <p>
          We use cookies and similar technologies to enhance your experience,
          remember your preferences, and analyze usage. You can control cookies
          through your browser settings.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">
          8. International Data Transfers
        </h2>
        <p>
          Your information may be transferred to and processed in countries
          other than Australia. We ensure appropriate safeguards are in place
          for such transfers.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">9. Children's Privacy</h2>
        <p>
          Our Service is not intended for anyone under 18. We do not knowingly
          collect personal information from those under 18.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">
          10. Changes to This Privacy Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by posting the new policy on this page.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl">11. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us
          at support@ledgerbot.co.
        </p>
      </section>
    </div>
  );
}
