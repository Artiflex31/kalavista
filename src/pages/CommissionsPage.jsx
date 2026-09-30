import { Link } from 'react-router'

function CommissionsPage() {
  return (
    <section className="page-shell" aria-labelledby="commissions-title">
      <div className="page-intro">
        <p className="section-label">COMMISSIONS</p>
        <h1 id="commissions-title">Let’s make something personal.</h1>
        <p>
          The full enquiry form comes later with the Node.js API. For now,
          this gives KalaVista a real, intentional commission route.
        </p>
      </div>

      <div className="page-card-grid">
        <article className="page-card">
          <h3>1. Share your idea</h3>
          <p>Tell me about the space, mood, colours, and story behind it.</p>
        </article>

        <article className="page-card">
          <h3>2. Choose a direction</h3>
          <p>We will decide the size, medium, timeline, and budget together.</p>
        </article>

        <article className="page-card">
          <h3>3. Create the work</h3>
          <p>Your commission becomes an original piece made for your space.</p>
        </article>
      </div>

      <Link className="page-action" to="/gallery">
        Browse the gallery first
      </Link>
    </section>
  )
}

export default CommissionsPage