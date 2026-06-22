export default function Privacy() {
  return (
    <>
      <nav className="navbar">
        <a href="/" className="nav-logo">
          <img src="/images/icon.png" alt="DodotX" />
          <span>Dodot<span className="x">X</span></span>
        </a>
        <ul className="nav-links">
          <li><a href="/#features">Features</a></li>
          <li><a href="/privacy">Privacy</a></li>
          <li><a href="/terms">Terms</a></li>
          <li><a href="/support">Support</a></li>
        </ul>
      </nav>

      <div className="legal">
        <h1>Privacy Policy</h1>
        <p className="date">Effective Date: June 22, 2026</p>

        <p>DodotX ("we", "our", "us") is committed to protecting the privacy of families and children. This Privacy Policy explains what data we collect, how we use it, and your rights.</p>

        <h2>1. Information We Collect</h2>
        <p><strong>Parent Accounts:</strong></p>
        <ul>
          <li>Email address (for account creation and password recovery)</li>
          <li>Name (to personalize the experience)</li>
          <li>Hashed password (securely encrypted, never stored in plain text)</li>
        </ul>
        <p><strong>Child Profiles:</strong></p>
        <ul>
          <li>Nickname or pet name only — we do <strong>not</strong> collect a child's real name, email, or any personal identifiers</li>
          <li>Age (to provide age-appropriate task suggestions)</li>
          <li>Avatar emoji selection (no photographs required)</li>
          <li>Task completion data and point totals</li>
        </ul>

        <h2>2. Children's Privacy (COPPA Compliance)</h2>
        <p>DodotX is designed with children's privacy as a core principle:</p>
        <ul>
          <li>Children <strong>never</strong> need an email address or password to use DodotX</li>
          <li>Children join only through a parent-generated, time-limited family code</li>
          <li>We only collect the minimum data necessary: a nickname, age, and task progress</li>
          <li>We do <strong>not</strong> serve advertisements to children</li>
          <li>We do <strong>not</strong> use any tracking, analytics, or fingerprinting SDKs</li>
          <li>Parents have full control to view, modify, or delete their child's data at any time through the app's Settings</li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <ul>
          <li>To provide and improve the DodotX service</li>
          <li>To generate AI-powered task suggestions and routines (processed server-side, not shared with third parties)</li>
          <li>To send password reset emails (only when requested by a parent)</li>
          <li>To maintain account security (rate limiting, JWT authentication)</li>
        </ul>

        <h2>4. Data Sharing</h2>
        <p>We do <strong>not</strong> sell, rent, or share personal data with third parties. Data is only shared in these limited cases:</p>
        <ul>
          <li><strong>AI Processing:</strong> Task data may be sent to our AI provider for generating suggestions. No personally identifiable information is included.</li>
          <li><strong>Email Delivery:</strong> Your email address is shared with our email provider (Gmail SMTP) solely for sending password reset codes.</li>
          <li><strong>Legal Requirements:</strong> We may disclose data if required by law or to protect the safety of our users.</li>
        </ul>

        <h2>5. Data Security</h2>
        <ul>
          <li>Passwords are hashed using bcrypt (industry standard)</li>
          <li>API endpoints are protected with JWT authentication</li>
          <li>Rate limiting prevents brute-force attacks (10 attempts per minute)</li>
          <li>Family invitation codes expire every 60 minutes</li>
          <li>All API documentation is disabled in production</li>
        </ul>

        <h2>6. Data Retention &amp; Deletion</h2>
        <p>We retain account data for as long as your account is active. Parents can:</p>
        <ul>
          <li>Delete any child profile (and all associated data) from the Settings screen</li>
          <li>Request full account deletion by contacting <a href="mailto:support@dodotx.net">support@dodotx.net</a></li>
        </ul>
        <p>Upon account deletion, all data is permanently removed within 30 days.</p>

        <h2>7. Visitor Access</h2>
        <p>DodotX offers a read-only "Visitor View" for family members (e.g., grandparents). Visitors enter a time-limited family code and can view children's progress without creating an account. No visitor data is stored.</p>

        <h2>8. Changes to This Policy</h2>
        <p>We may update this policy from time to time. We will notify registered users by email of any material changes. Continued use of DodotX after changes constitutes acceptance of the updated policy.</p>

        <h2>9. Contact Us</h2>
        <p>If you have questions about this Privacy Policy or wish to exercise your rights:</p>
        <ul>
          <li>Email: <a href="mailto:support@dodotx.net">support@dodotx.net</a></li>
          <li>Website: <a href="https://dodotx.net/support">dodotx.net/support</a></li>
        </ul>
      </div>

      <footer className="footer">
        <div className="footer-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/support">Support</a>
        </div>
        <p className="footer-copy">&copy; 2026 DodotX. All rights reserved.</p>
      </footer>
    </>
  );
}
