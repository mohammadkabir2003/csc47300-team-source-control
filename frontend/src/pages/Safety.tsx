import Header from '../components/Header'

export default function Safety() {
  return (
    <>
      <Header />
      
      <main id="main" className="container" style={{ maxWidth: '800px' }}>
        <header className="page-header">
          <h1>Safety Guidelines</h1>
          <p className="muted">Stay safe while buying and selling on CCNY Exchange</p>
        </header>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Meeting Guidelines</h2>
          <ul style={{ marginLeft: '1.5rem', marginTop: '1rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Meet in public, well-lit areas on campus</li>
            <li style={{ marginBottom: '0.5rem' }}>Bring a friend when possible</li>
            <li style={{ marginBottom: '0.5rem' }}>Meet during daylight hours</li>
            <li style={{ marginBottom: '0.5rem' }}>Inform someone of your plans</li>
          </ul>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Transaction Safety</h2>
          <ul style={{ marginLeft: '1.5rem', marginTop: '1rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Inspect items before payment</li>
            <li style={{ marginBottom: '0.5rem' }}>Use secure payment methods</li>
            <li style={{ marginBottom: '0.5rem' }}>Don't share personal financial information</li>
            <li style={{ marginBottom: '0.5rem' }}>Trust your instincts</li>
          </ul>
        </div>

        <div className="card">
          <h2>Reporting Issues</h2>
          <p style={{ marginTop: '1rem' }}>
            If you encounter suspicious behavior or feel unsafe, contact campus security immediately.
            You can also report issues to our support team.
          </p>
        </div>
      </main>
    </>
  )
}
