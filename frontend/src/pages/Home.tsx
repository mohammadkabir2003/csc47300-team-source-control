import Header from '../components/Header'

export default function Home() {
  return (
    <>
      <Header />
      
      <main id="main" className="center hero">
        <h1>Source Control's Project!</h1>
        <p className="lead">
          A campus-focused eCommerce marketplace for verified CCNY students.
          Buy, sell, and exchange textbooks, electronics, and dorm essentials—safely, on campus.
        </p>

        <div className="actions">
          <a className="btn btn-primary" href="/market">Browse Listings</a>
          <a className="btn btn-ghost" href="/sell">Sell an Item</a>
        </div>

        <section className="usp">
          <article className="pill-card">
            <h3>CCNY-only</h3>
            <p>Access limited to verified CCNY students for a trusted experience.</p>
          </article>
          <article className="pill-card">
            <h3>Meet on Campus</h3>
            <p>Coordinate exchanges at well-lit, public CCNY locations.</p>
          </article>
          <article className="pill-card">
            <h3>Faster & Cheaper</h3>
            <p>Skip the shipping fees and delays—trade directly with classmates.</p>
          </article>
        </section>
      </main>
    </>
  )
}
