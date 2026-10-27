import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileMenu from "./MobileMenu";

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState("#");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    setActiveLink(href);
    setMenuOpen(false);

    if (href === "#") return;

    const target = document.querySelector(href);
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 80,
        behavior: "smooth",
      });
    }
  };



  return (
    <>
      <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
        <div className="navbar-inner">
          <div className="navbar-logo" onClick={(e) => handleLinkClick(e, "#home")}>
            <img
              className="navbar-logo-icon"
              src="/assets/clinicconnect-logo.png"
              alt="Clinic Connect logo"
            />
            <span className="navbar-logo-text">
              Clinic Connect
            </span>
          </div>

          <div className="navbar-links">
            <a href="#home" className={`navbar-link ${activeLink === "#home" ? "navbar-link-active" : ""}`} onClick={(e) => handleLinkClick(e, "#home")}>
              Home
            </a>
            <a href="#about" className={`navbar-link ${activeLink === "#about" ? "navbar-link-active" : ""}`} onClick={(e) => handleLinkClick(e, "#about")}>
              About
            </a>
            <a href="#doctors" className={`navbar-link ${activeLink === "#doctors" ? "navbar-link-active" : ""}`} onClick={(e) => handleLinkClick(e, "#doctors")}>
              Doctors
            </a>
            <a href="#departments" className={`navbar-link ${activeLink === "#departments" ? "navbar-link-active" : ""}`} onClick={(e) => handleLinkClick(e, "#departments")}>
              Departments
            </a>
            <a href="#facilities" className={`navbar-link ${activeLink === "#facilities" ? "navbar-link-active" : ""}`} onClick={(e) => handleLinkClick(e, "#facilities")}>
              Facilities
            </a>
            <a href="#testimonials" className={`navbar-link ${activeLink === "#testimonials" ? "navbar-link-active" : ""}`} onClick={(e) => handleLinkClick(e, "#testimonials")}>
              Testimonials
            </a>
            <a href="#contact" className={`navbar-link ${activeLink === "#contact" ? "navbar-link-active" : ""}`} onClick={(e) => handleLinkClick(e, "#contact")}>
              Contact
            </a>
          </div>

          <div className="navbar-actions">
            <button
              type="button"
              className="navbar-login"
              onClick={() => navigate("/login", { state: { fromNormalLogin: true } })}
            >
              Login
            </button>
            <a href="#book" className="btn btn-primary navbar-book" onClick={(e) => handleLinkClick(e, "#book")}>
              Book Appointment
            </a>
          </div>

          <button
            type="button"
            className="navbar-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </nav>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

export default Navbar;
