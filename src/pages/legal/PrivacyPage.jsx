import './LegalPage.css'

function PrivacyPage() {
  return (
    <section className="legal-page">
      <div className="legal-page__inner">
        <p className="legal-page__eyebrow">LEGAL</p>
        <h1>Privacy Policy</h1>
        <p className="legal-page__updated">Last updated: 15 October 2026</p>

        <p>
          KalaVista ("we", "us", "our") respects your privacy. This policy
          explains what information we collect, why we collect it, and how we
          protect it.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>When you place an order or submit a commission:</h3>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Phone number (optional)</li>
          <li>Shipping address (for orders)</li>
          <li>Commission details (budget, message, reference images)</li>
        </ul>

        <h3>When you browse the site:</h3>
        <ul>
          <li>
            Browser-local favourites (stored only on your device, never sent to
            us)
          </li>
          <li>Basic anonymous usage statistics</li>
        </ul>

        <h3>When you make a payment:</h3>
        <ul>
          <li>
            We do not store your card details. Payment information is handled
            securely by Razorpay.
          </li>
          <li>
            We store the payment reference number, status, and amount for order
            tracking and reconciliation.
          </li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To process and fulfil your orders and commissions</li>
          <li>To communicate about your order status and delivery</li>
          <li>To respond to your enquiries</li>
          <li>To comply with legal and tax obligations</li>
        </ul>

        <h2>3. Sharing Your Information</h2>
        <p>
          We share limited information with the following service providers:
        </p>
        <ul>
          <li>
            <strong>Razorpay</strong> — for processing payments. Razorpay has
            its own privacy policy: https://razorpay.com/privacy/
          </li>
          <li>
            <strong>Cloudinary</strong> — for storing artwork and reference
            images
          </li>
          <li>
            <strong>Courier partners</strong> — to deliver physical artworks
            (name, address, phone)
          </li>
          <li>
            <strong>Neon</strong> — for securely hosting our database
          </li>
        </ul>
        <p>We do not sell your personal information to any third party.</p>

        <h2>4. Data Retention</h2>
        <p>
          Order and commission records are retained for at least 7 years for tax
          and accounting purposes. If you wish to have your enquiry deleted,
          contact us at kalavista24x7@gmail.com.
        </p>

        <h2>5. Security</h2>
        <p>
          We use industry-standard security measures including HTTPS encryption,
          hashed passwords, and access controls. No system is 100% secure, but
          we take reasonable measures to protect your data.
        </p>

        <h2>6. Cookies and Local Storage</h2>
        <p>
          We use browser local storage for two purposes: remembering your theme
          preference and saving your favourite artworks locally. We do not use
          third-party advertising cookies.
        </p>

        <h2>7. Your Rights</h2>
        <p>
          You have the right to access, correct, or request deletion of your
          personal information. To exercise these rights, email us at
          kalavista24x7@gmail.com.
        </p>

        <h2>8. Children</h2>
        <p>
          The Service is not intended for children under 18. We do not knowingly
          collect information from children.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. Significant changes
          will be communicated via a notice on the site.
        </p>

        <h2>10. Contact</h2>
        <p>
          For privacy-related questions, contact us at{' '}
          <a href="mailto:[kalavista24x7@gmail.com]">
            [kalavista24x7@gmail.com]
          </a>
          .
        </p>
      </div>
    </section>
  )
}

export default PrivacyPage
