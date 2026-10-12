import './LegalPage.css'

function ShippingPage() {
  return (
    <section className="legal-page">
      <div className="legal-page__inner">
        <p className="legal-page__eyebrow">LEGAL</p>
        <h1>Shipping Policy</h1>
        <p className="legal-page__updated">Last updated: 15 October 2026</p>

        <h2>1. Shipping Within India</h2>
        <p>
          We currently ship original artworks within India only. Shipping is
          handled through reputable courier partners such as Delhivery, Blue
          Dart, or DTDC, depending on location and package requirements.
        </p>

        <h2>2. Packaging</h2>
        <p>
          Original artworks are packed with care using acid-free materials,
          rigid backing, and water-resistant outer packaging to protect against
          transit damage.
        </p>

        <h2>3. Delivery Timeline</h2>
        <ul>
          <li>Metro cities: 3-5 business days</li>
          <li>Tier 2 and 3 cities: 5-8 business days</li>
          <li>Remote locations: 8-12 business days</li>
        </ul>
        <p>
          These timelines are estimates and may vary due to courier delays,
          weather, or other unforeseen circumstances.
        </p>

        <h2>4. Shipping Charges</h2>
        <p>
          Shipping charges are calculated at checkout based on your delivery
          address and the size of the artwork. Free shipping may be offered on
          selected orders.
        </p>

        <h2>5. Order Tracking</h2>
        <p>
          Once your order is shipped, you will receive an email with a tracking
          link and courier information. You can also track your order at any
          time through the unique tracking link provided in your order
          confirmation email.
        </p>

        <h2>6. Delivery Address</h2>
        <p>
          Please ensure your delivery address is accurate and complete. We are
          not responsible for delays or failed deliveries caused by incorrect
          addresses. If you need to update your address, contact us at
          [YOUR_EMAIL] within 12 hours of placing the order.
        </p>

        <h2>7. Failed Delivery</h2>
        <p>
          If a delivery attempt fails because no one was available to receive
          the package, the courier will typically attempt one more delivery. If
          both attempts fail, the package may be returned to us. In such cases,
          additional shipping charges may apply for re-shipment.
        </p>

        <h2>8. International Shipping</h2>
        <p>
          We do not currently offer international shipping. If you are outside
          India and wish to purchase, contact us at [YOUR_EMAIL] to discuss
          options.
        </p>

        <h2>9. Contact</h2>
        <p>
          For shipping-related questions, contact us at{' '}
          <a href="mailto:[kalavista24x7@gmail.com]">kalavista24x7@gmail.com</a>
          .
        </p>
      </div>
    </section>
  )
}

export default ShippingPage
