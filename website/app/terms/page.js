export default function Terms() {
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
        <h1>Terms of Service</h1>
        <p className="date">Effective Date: June 22, 2026</p>

        <p>Welcome to DodotX. By using our application and website, you agree to these Terms of Service. Please read them carefully.</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using DodotX (the "Service"), you agree to be bound by these Terms. If you do not agree, please do not use the Service. If you are a parent or guardian creating an account on behalf of a child, you represent that you have the authority to accept these Terms on their behalf.</p>

        <h2>2. Eligibility</h2>
        <ul>
          <li><strong>Parent Accounts:</strong> You must be at least 18 years old to create a parent account.</li>
          <li><strong>Child Profiles:</strong> Children under 13 may only use DodotX through a parent-created profile. Children do not create their own accounts — they join via a parent-generated family code.</li>
        </ul>

        <h2>3. Account Responsibilities</h2>
        <ul>
          <li>You are responsible for maintaining the security of your account credentials</li>
          <li>Passwords must meet our security standards (minimum 8 characters, at least 1 number and 1 special character)</li>
          <li>You are responsible for all activity that occurs under your account</li>
          <li>You must not share your family PIN with unauthorized individuals</li>
        </ul>

        <h2>4. Use of the Service</h2>
        <p>DodotX is a family task management and gamification platform. You agree to use it only for its intended purpose and not to:</p>
        <ul>
          <li>Attempt to reverse-engineer, decompile, or hack the Service</li>
          <li>Use the Service for any unlawful purpose</li>
          <li>Upload harmful, offensive, or inappropriate content</li>
          <li>Attempt to circumvent security measures (rate limiting, authentication)</li>
          <li>Create multiple accounts for fraudulent purposes</li>
        </ul>

        <h2>5. AI-Generated Content</h2>
        <p>DodotX uses artificial intelligence to suggest tasks, routines, and rewards. AI-generated suggestions are provided as guidance only. Parents should review all AI suggestions before assigning them to children. We do not guarantee the accuracy or appropriateness of AI-generated content.</p>

        <h2>6. Intellectual Property</h2>
        <p>The DodotX name, logo, design, and all content created by us are owned by DodotX. You may not use our branding without written permission. Content you create within the app (task names, reward descriptions) remains yours.</p>

        <h2>7. Availability &amp; Updates</h2>
        <p>We strive to keep DodotX available at all times but do not guarantee uninterrupted service. We may update, modify, or discontinue features at any time. We will provide reasonable notice for material changes.</p>

        <h2>8. Termination</h2>
        <p>You may delete your account at any time through the app or by contacting support. We reserve the right to suspend or terminate accounts that violate these Terms.</p>

        <h2>9. Limitation of Liability</h2>
        <p>DodotX is provided "as is" without warranties of any kind. To the fullest extent permitted by law, DodotX shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>

        <h2>10. Changes to Terms</h2>
        <p>We may update these Terms from time to time. We will notify registered users of material changes by email. Continued use of DodotX after changes constitutes acceptance.</p>

        <h2>11. Governing Law</h2>
        <p>These Terms are governed by and construed in accordance with applicable laws. Any disputes shall be resolved through good-faith negotiation before pursuing formal legal action.</p>

        <h2>12. Contact Us</h2>
        <p>For questions about these Terms:</p>
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
