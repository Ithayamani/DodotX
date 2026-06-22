export default function Home() {
  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <a href="/" className="nav-logo">
          <img src="/images/icon.png" alt="DodotX" />
          <span>Dodot<span className="x">X</span></span>
        </a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="/privacy">Privacy</a></li>
          <li><a href="/terms">Terms</a></li>
          <li><a href="/support">Support</a></li>
        </ul>
      </nav>

      {/* Hero */}
      <section className="hero">
        <h1>Make Everyday Things<br />a <span className="green">Game</span></h1>
        <p>
          DodotX turns daily tasks into fun adventures. Kids earn points,
          unlock trophies, and claim rewards — while parents manage everything
          from a single dashboard.
        </p>
        <div className="hero-buttons">
          <a href="#download" className="btn-primary">Download on App Store</a>
          <a href="#download" className="btn-secondary">Get on Google Play</a>
        </div>
      </section>

      {/* Screenshots */}
      <section className="screenshots">
        <img src="/screenshots/landing.png" alt="DodotX Landing" />
        <img src="/screenshots/dashboard.png" alt="Child Dashboard" />
        <img src="/screenshots/tasks.png" alt="Daily Tasks" />
        <img src="/screenshots/trophies.png" alt="Trophies" />
        <img src="/screenshots/shop.png" alt="Rewards Shop" />
      </section>

      {/* Features */}
      <section className="features" id="features">
        <h2>Why Families Love DodotX</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Smart Task Management</h3>
            <p>Create custom tasks with point values, categories, and schedules. AI suggests age-appropriate routines automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Trophies &amp; Rewards</h3>
            <p>Kids earn trophies for streaks and perfect days. Parents set up rewards that kids can unlock with their points.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👨‍👩‍👧‍👦</div>
            <h3>Family Dashboard</h3>
            <p>Parents manage tasks, track progress, and see AI insights. Kids get their own gamified view with no distractions.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered</h3>
            <p>Smart routines, difficulty adjustments, and dynamic rewards that adapt to each child's age and progress.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Privacy-First</h3>
            <p>COPPA compliant. Kids use nicknames — no email required. Family codes expire every 60 minutes for safety.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👀</div>
            <h3>Visitor View</h3>
            <p>Grandparents and family can view children's progress with a read-only visitor link. No account needed.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta" id="download">
        <h2>Ready to Make Chores Fun?</h2>
        <p>Download DodotX and start your family's adventure today.</p>
        <div className="hero-buttons">
          <a href="#" className="btn-primary">Download on App Store</a>
          <a href="#" className="btn-secondary">Get on Google Play</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/support">Support</a>
        </div>
        <p className="footer-copy">&copy; 2026 DodotX. All rights reserved. COPPA compliant.</p>
      </footer>
    </>
  );
}
