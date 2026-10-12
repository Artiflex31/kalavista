import { Link } from 'react-router'
import './LegalPage.css'

function ContactPage() {
  return (
    <section className="legal-page">
      <div className="legal-page__inner">
        <p className="legal-page__eyebrow">GET IN TOUCH</p>
        <h1>Contact KalaVista</h1>

        <p>
          Whether you have a question about an artwork, a commission, an
          existing order, or just want to say hello — we would love to hear from
          you.
        </p>

        <div className="legal-page__contact-grid">
          <div className="legal-page__contact-card">
            <h2>Email</h2>
            <p>For general enquiries, orders, commissions, and support:</p>
            <a href="mailto:[kalavista24x7@gmail.com]">
              kalavista24x7@gmail.com
            </a>
          </div>

          <div className="legal-page__contact-card">
            <h2>Phone</h2>
            <p>Available Monday to Saturday, 10 AM – 7 PM IST:</p>
            <a href="tel:[8924901326]">8924901326</a>
          </div>

          <div className="legal-page__contact-card">
            <h2>Studio</h2>
            <p>Based in Gurugram, India</p>
            <p>Visits by appointment only</p>
          </div>

          <div className="legal-page__contact-card">
            <h2>Response Time</h2>
            <p>
              We aim to respond to all enquiries within{' '}
              <strong>24-48 hours</strong>. Commission requests may take
              slightly longer as we review your brief carefully.
            </p>
          </div>
        </div>

        <h2>Commission Requests</h2>
        <p>
          Ready to start a commission?{' '}
          <Link to="/commissions">Fill out our commission form</Link> and share
          your idea. We will get back to you with a quote within 2-3 business
          days.
        </p>

        <h2>Order Support</h2>
        <p>
          Already placed an order? Use the tracking link in your order
          confirmation email, or contact us with your order reference number.
        </p>
      </div>
    </section>
  )
}

export default ContactPage
