import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileMenu from "./MobileMenu";
import { useAuth } from "../../../context/AuthContext";
import { usePendingReview } from "../../../context/PendingReviewContext";

const dashboardPathByRole = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  receptionist: "/reception/dashboard",
  pharmacist: "/pharmacy/dashboard",
  admin: "/admin/dashboard",
};

function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const { clearReview } = usePendingReview();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState("#");
  const role = user?.role?.toLowerCase();
  const portalPath = dashboardPathByRole[role];
  const portalLabel =
    role === "patient" ? "Your Patient Portal" : "Your Dashboard";

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

  const handleSignout = () => {
    clearReview();
    logout();
    setMenuOpen(false);
    navigate("/", { replace: true });
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
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="navbar-login"
                  onClick={handleSignout}
                >
                  Signout
                </button>
                {portalPath && (
                  <button
                    type="button"
                    className="navbar-login"
                    onClick={() => navigate(portalPath)}
                  >
                    {portalLabel}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className="navbar-login"
                onClick={() =>
                  navigate("/login", { state: { fromNormalLogin: true } })
                }
              >
                Login
              </button>
            )}
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

      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        portalLabel={portalLabel}
        portalPath={portalPath}
        onSignout={handleSignout}
      />
    </>
  );
}

export default Navbar;
