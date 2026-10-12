import './LegalPage.css'

function TermsPage() {
  return (
    <section className="legal-page">
      <div className="legal-page__inner">
        <p className="legal-page__eyebrow">LEGAL</p>
        <h1>Terms of Service</h1>
        <p className="legal-page__updated">Last updated: 15 October 2026</p>

        <p>
          Welcome to KalaVista. These Terms of Service ("Terms") govern your
          access to and use of the KalaVista website, mobile application, and
          related services (collectively, the "Service"). By accessing or using
          the Service, you agree to be bound by these Terms.
        </p>

        <h2>1. About KalaVista</h2>
        <p>
          KalaVista is an independent art studio operating from Gurugram, India,
          that sells original artworks and accepts commission requests. You can
          reach us at kalavista24x7@gmail.com or 8924901326.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years old to make a purchase or submit a
          commission request. By using the Service, you represent that you meet
          this requirement.
        </p>

        <h2>3. Orders and Acceptance</h2>
        <p>
          All orders placed through the Service are subject to acceptance by
          KalaVista. We reserve the right to refuse or cancel any order for any
          reason, including but not limited to availability, pricing errors, or
          suspicion of fraud. If we cancel an order, we will refund any amount
          already paid.
        </p>

        <h2>4. Pricing and Payment</h2>
        <p>
          Prices are listed in Indian Rupees (INR) and are inclusive of
          applicable taxes unless stated otherwise. We accept payments via
          Razorpay (cards, UPI, netbanking, wallets) and manual UPI transfer.
          Manual UPI payments must be verified by us before the order is
          confirmed; you will be notified by email once verification is
          complete.
        </p>

        <h2>5. Shipping and Delivery</h2>
        <p>
          Original artworks are shipped within India using reputable courier
          partners. Delivery timelines, charges, and packaging are described in
          our Shipping Policy. Risk of loss passes to you upon delivery to the
          address you provide.
        </p>

        <h2>6. Returns and Refunds</h2>
        <p>
          Our returns and refund policy is described in the Refund &
          Cancellation Policy. In summary: original artworks are not eligible
          for return due to their one-of-a-kind nature, except in the case of
          damage during transit or a materially different item.
        </p>

        <h2>7. Commission Requests</h2>
        <p>
          Commission requests are subject to discussion, quotation, and mutual
          agreement before work begins. A 60% advance is required to start a
          commission; the remaining 40% is due before delivery. Progress and
          revisions are managed through the KalaVista commission tracker.
        </p>

        <h2>8. Intellectual Property</h2>
        <p>
          All artwork images, stories, and content on the Service are the
          property of KalaVista and the artist. You may not reproduce,
          distribute, or use this content for commercial purposes without prior
          written permission. Purchasing an artwork transfers ownership of the
          physical piece, not the copyright.
        </p>

        <h2>9. Acceptable Use</h2>
        <p>
          You agree not to misuse the Service — including attempting to gain
          unauthorised access, transmitting malware, or using the Service for
          unlawful purposes.
        </p>

        <h2>10. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, KalaVista shall not be liable
          for any indirect, incidental, or consequential damages arising from
          your use of the Service. Our total liability shall not exceed the
          amount paid by you for the specific order in question.
        </p>

        <h2>11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. The "Last updated" date
          at the top indicates the most recent revision. Continued use of the
          Service after changes constitutes acceptance of the updated Terms.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by the laws of India. Any disputes shall be
          subject to the exclusive jurisdiction of the courts in Gurugram.
        </p>

        <h2>13. Contact</h2>
        <p>
          Questions about these Terms? Reach us at{' '}
          <a href="mailto:[YOUR_EMAIL]">kalavista24x7@gmail.com</a>.
        </p>
      </div>
    </section>
  )
}

export default TermsPage
