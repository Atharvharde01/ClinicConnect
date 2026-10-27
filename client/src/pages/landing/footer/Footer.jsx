function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">
            <span>Clinic Connect</span>
          </div>
          <p>
            Clinic Connect is committed to providing premium healthcare through clinical excellence and
            compassionate service.
          </p>
          <div className="footer-social">
            <a href="#footer" aria-label="Facebook">
              <span className="material-symbols-outlined">face_nod</span>
            </a>
            <a href="#footer" aria-label="Twitter">
              <span className="material-symbols-outlined">public</span>
            </a>
            <a href="mailto:clinicconnect.auth@gmail.com" aria-label="Email">
              <span className="material-symbols-outlined">mail</span>
            </a>
          </div>
        </div>

        <div className="footer-column">
          <h4>Quick Links</h4>
          <a href="#doctors">Find a Doctor</a>
          <a href="/login">Patient Portal</a>
          <a href="#facilities">Facilities &amp; Services</a>
          <a href="">Medical Records</a>
          <a href="">Health Packages</a>
        </div>

        <div className="footer-column">
          <h4>Departments</h4>
          <a href="#cardiology">Cardiology</a>
          <a href="#neurology">Neurology</a>
          <a href="#orthopedics">Orthopedics</a>
          <a href="#pediatrics">Pediatrics</a>
          <a href="#diagnostics">Diagnostics</a>
        </div>

        <div className="footer-column">
          <h4>Contact Us</h4>
          <div className="footer-contact-item">
            <span className="material-symbols-outlined">location_on</span>
            <span>
              123 Medical Square, <br />
              Central Business District, <br />
              London, UK 10012
            </span>
          </div>
          <div className="footer-contact-item">
            <span className="material-symbols-outlined">call</span>
            <span>+1 (800) 555-Clinic Connect</span>
          </div>
          <div className="footer-contact-item">
            <span className="material-symbols-outlined">mail</span>
            <span>clinicconnect.auth@gmail.com</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Clinic Connect Medical Group. All rights reserved.</p>
        <div className="footer-bottom-links">
          <a href="">Privacy Policy</a>
          <a href="">Terms of Service</a>
          <a href="">Cookie Policy</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
