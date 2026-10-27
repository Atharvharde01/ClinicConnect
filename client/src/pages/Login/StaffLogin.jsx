import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import {
  requestStaffForgotPassword,
  verifyStaffForgotPasswordOtp,
  resetStaffPassword,
} from "../../services/authService";
import "../../styles/login.css";

const roles = [
  {
    key: "admin",
    label: "Administrator",
    modalLabel: "Admin",
    subtitle: "(Main Doctor)",
    icon: "shield",
    route: "/admin/dashboard",
  },
  {
    key: "doctor",
    label: "Medical Doctor",
    modalLabel: "Doctors",
    subtitle: "Clinical Staff",
    icon: "stethoscope",
    route: "/doctor/dashboard",
  },
  {
    key: "receptionist",
    label: "Receptionist",
    modalLabel: "Receptionist",
    subtitle: "Front Desk",
    icon: "desk",
    route: "/reception/dashboard",
  },
  {
    key: "pharmacist",
    label: "Pharmacist",
    modalLabel: "Pharmacist",
    subtitle: "Pharmacy",
    icon: "medication",
    route: "/pharmacy/dashboard",
  },
];

const STEPS = {
  LOGIN: "LOGIN",
  FORGOT_EMAIL: "FORGOT_EMAIL",
  FORGOT_OTP: "FORGOT_OTP",
  FORGOT_RESET: "FORGOT_RESET",
};

const OTP_DURATION = 5 * 60; // 5 minutes

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

function StaffLogin() {
  const navigate = useNavigate();
  const { staffLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password Flow States
  const [step, setStep] = useState(STEPS.LOGIN);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info"); // "info" | "success" | "error"
  const otpInputRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = isRoleModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isRoleModalOpen]);

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (step !== STEPS.FORGOT_OTP || otpExpiresIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setOtpExpiresIn((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpExpiresIn, step]);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (step !== STEPS.FORGOT_OTP || resendIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendIn, step]);

  useEffect(() => {
    if (step === STEPS.FORGOT_OTP) {
      otpInputRef.current?.focus();
    }
  }, [step]);

  // Handle standard Staff Login
  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setMessage("");

      const user = await staffLogin(email, password);

      // Role validation
      if (user.role !== selectedRole.key.toLowerCase()) {
        throw new Error(
          `You are not authorized to login as ${selectedRole.label}.`
        );
      }

      navigate(selectedRole.route, {
        state: { successMessage: "Welcome back!" },
        replace: true,
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Login failed. Please check your credentials."
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Send Forgot Password OTP
  const handleSendForgotPasswordOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage("Please enter your registered email address.");
      setMessageType("error");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");

      const response = await requestStaffForgotPassword(normalizedEmail);

      setStep(STEPS.FORGOT_OTP);
      setOtp("");
      setOtpExpiresIn(OTP_DURATION);
      setResendIn(60);
      setMessage(
        response.message || "A 6-digit OTP has been sent to your email."
      );
      setMessageType("info");
    } catch (error) {
      const serverMessage = error.response?.data?.message;
      const cooldownMatch = serverMessage?.match(/wait\s+(\d+)\s+seconds/i);

      if (cooldownMatch) setResendIn(Number(cooldownMatch[1]));

      setMessage(
        serverMessage || "Failed to send password reset OTP. Please try again."
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (event) => {
    event?.preventDefault();

    if (otpExpiresIn === 0) {
      setMessage("Verification code expired. Please request a new one.");
      setMessageType("error");
      return;
    }

    if (otp.length !== 6) {
      setMessage("Please enter the complete 6-digit OTP code.");
      setMessageType("error");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");

      await verifyStaffForgotPasswordOtp(email.trim().toLowerCase(), otp);

      setStep(STEPS.FORGOT_RESET);
      setMessage("OTP verified successfully. Please enter your new password.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Invalid or expired OTP code."
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!newPassword || !confirmPassword) {
      setMessage("Please fill in both password fields.");
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation password do not match.");
      setMessageType("error");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      setMessageType("error");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");

      const response = await resetStaffPassword(
        email.trim().toLowerCase(),
        otp,
        newPassword,
        confirmPassword
      );

      // Successfully updated password! Switch back to LOGIN mode
      setStep(STEPS.LOGIN);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      setMessage(
        response.message ||
          "Password updated successfully. Please log in with your new password."
      );
      setMessageType("success");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Password reset failed. Please try again."
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    setStep(STEPS.LOGIN);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
    setMessageType("info");
  };

  const isOtpExpired = step === STEPS.FORGOT_OTP && otpExpiresIn === 0;

  return (
    <div className="login-page">
      <header className="login-page-header">
        <h2>
          <span className="material-symbols-outlined" aria-hidden="true">
            security
          </span>
          Secure Healthcare Management System
        </h2>
      </header>
      <main className="login-main">
        <div className="login-shell">
          <section className="login-card">
            <div className="login-card-brand">
              <div className="login-logo-stack">
                <div className="login-logo-mark">
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    health_and_safety
                  </span>
                </div>
                <span className="login-brand-name">Clinic Connect</span>
              </div>
              <h3>
                {step === STEPS.LOGIN
                  ? "Welcome Back"
                  : step === STEPS.FORGOT_EMAIL
                  ? "Forgot Password"
                  : step === STEPS.FORGOT_OTP
                  ? "Verify OTP"
                  : "Reset Password"}
              </h3>
              <p className="login-card-subtitle">
                {step === STEPS.LOGIN
                  ? "Login to access the Hospital Management System"
                  : step === STEPS.FORGOT_EMAIL
                  ? "Enter your registered email address to receive an OTP"
                  : step === STEPS.FORGOT_OTP
                  ? `Enter the 6-digit verification code sent to your email`
                  : "Set a strong new password for your staff account"}
              </p>
            </div>

            {message && (
              <div
                style={{
                  marginBottom: "1.25rem",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "500",
                  lineHeight: "1.4",
                  color:
                    messageType === "error"
                      ? "#dc2626"
                      : messageType === "success"
                      ? "#15803d"
                      : "#0284c7",
                  backgroundColor:
                    messageType === "error"
                      ? "#fef2f2"
                      : messageType === "success"
                      ? "#f0fdf4"
                      : "#f0f9ff",
                  border: `1px solid ${
                    messageType === "error"
                      ? "#fca5a5"
                      : messageType === "success"
                      ? "#86efac"
                      : "#bae6fd"
                  }`,
                }}
                role="status"
              >
                {message}
              </div>
            )}

            {/* STEP: NORMAL STAFF LOGIN */}
            {step === STEPS.LOGIN && (
              <form className="login-form" onSubmit={handleLoginSubmit}>
                <div className="login-field">
                  <label className="login-label" htmlFor="role-trigger">
                    Select Role
                  </label>
                  <button
                    className="login-role-trigger"
                    id="role-trigger"
                    type="button"
                    onClick={() => setIsRoleModalOpen(true)}
                  >
                    <span className="login-role-current">
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                      >
                        {selectedRole.icon}
                      </span>
                      <span>{selectedRole.label}</span>
                    </span>
                    <span
                      className="material-symbols-outlined login-chevron"
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                  </button>
                </div>

                <div className="login-field">
                  <label className="login-label" htmlFor="login-email">
                    Email
                  </label>
                  <div className="login-input-wrap">
                    <span
                      className="material-symbols-outlined login-field-icon"
                      aria-hidden="true"
                    >
                      person
                    </span>
                    <input
                      className="login-input"
                      id="login-email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="e.g. clinicconnect@gmail.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label className="login-label" htmlFor="login-password">
                    Password
                  </label>
                  <div className="login-input-wrap">
                    <span
                      className="material-symbols-outlined login-field-icon"
                      aria-hidden="true"
                    >
                      lock
                    </span>
                    <input
                      className="login-input has-password-toggle"
                      id="login-password"
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      required
                      type={isPasswordVisible ? "text" : "password"}
                      value={password}
                    />
                    <button
                      className="login-password-toggle"
                      type="button"
                      aria-label={
                        isPasswordVisible ? "Hide password" : "Show password"
                      }
                      onClick={() =>
                        setIsPasswordVisible((current) => !current)
                      }
                    >
                      <span className="material-symbols-outlined">
                        {isPasswordVisible ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    marginTop: "-12px",
                    marginBottom: "4px",
                  }}
                >
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--login-primary)",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    onClick={() => {
                      setStep(STEPS.FORGOT_EMAIL);
                      setMessage("");
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  className="login-submit"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="login-spinner" aria-label="Logging in" />
                  ) : (
                    "Login"
                  )}
                </button>
              </form>
            )}

            {/* STEP 1: FORGOT PASSWORD - ENTER EMAIL */}
            {step === STEPS.FORGOT_EMAIL && (
              <form
                className="login-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendForgotPasswordOtp();
                }}
              >
                <div className="login-field">
                  <label className="login-label" htmlFor="forgot-email">
                    Registered Email Address
                  </label>
                  <div className="login-input-wrap">
                    <span
                      className="material-symbols-outlined login-field-icon"
                      aria-hidden="true"
                    >
                      email
                    </span>
                    <input
                      className="login-input"
                      id="forgot-email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="e.g. john@clinicconnect.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                <button
                  className="login-submit"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span
                      className="login-spinner"
                      aria-label="Sending OTP"
                    />
                  ) : (
                    "Send OTP"
                  )}
                </button>

                <div style={{ textAlign: "center", marginTop: "8px" }}>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--login-outline)",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                    onClick={handleBackToLogin}
                  >
                    ← Back to Login
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: FORGOT PASSWORD - ENTER OTP */}
            {step === STEPS.FORGOT_OTP && (
              <form className="login-form" onSubmit={handleVerifyOtp}>
                <div className="login-field">
                  <label className="login-label" htmlFor="forgot-email-disabled">
                    Email Address
                  </label>
                  <div className="login-input-wrap">
                    <span
                      className="material-symbols-outlined login-field-icon"
                      aria-hidden="true"
                    >
                      email
                    </span>
                    <input
                      className="login-input"
                      id="forgot-email-disabled"
                      disabled
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label className="login-label" htmlFor="forgot-otp">
                    Enter 6-Digit OTP
                  </label>
                  <div className="login-input-wrap">
                    <span
                      className="material-symbols-outlined login-field-icon"
                      aria-hidden="true"
                    >
                      pin
                    </span>
                    <input
                      className="login-input"
                      id="forgot-otp"
                      inputMode="numeric"
                      maxLength="6"
                      onChange={(event) =>
                        setOtp(event.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Enter 6-digit code"
                      ref={otpInputRef}
                      required
                      type="text"
                      value={otp}
                    />
                  </div>
                </div>

                <p
                  className="login-card-subtitle"
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    marginTop: "-12px",
                  }}
                >
                  {isOtpExpired
                    ? "OTP Expired. Please resend a new OTP."
                    : `OTP expires in ${formatTime(otpExpiresIn)}`}
                </p>

                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button
                    className="login-submit"
                    type="button"
                    disabled={isSubmitting || resendIn > 0}
                    onClick={() => handleSendForgotPasswordOtp()}
                    style={{
                      flex: 1,
                      backgroundColor: "transparent",
                      color: "var(--login-primary)",
                      border: "1px solid var(--login-primary)",
                      boxShadow: "none",
                    }}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                  </button>

                  <button
                    className="login-submit"
                    type="submit"
                    disabled={isSubmitting || isOtpExpired || otp.length !== 6}
                    style={{ flex: 1 }}
                  >
                    {isSubmitting ? (
                      <span
                        className="login-spinner"
                        aria-label="Verifying OTP"
                      />
                    ) : (
                      "Verify OTP"
                    )}
                  </button>
                </div>

                <div style={{ textAlign: "center", marginTop: "8px" }}>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--login-outline)",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                    onClick={handleBackToLogin}
                  >
                    ← Back to Login
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: FORGOT PASSWORD - RESET PASSWORD */}
            {step === STEPS.FORGOT_RESET && (
              <form className="login-form" onSubmit={handleResetPassword}>
                <div className="login-field">
                  <label className="login-label" htmlFor="new-password">
                    New Password
                  </label>
                  <div className="login-input-wrap">
                    <span
                      className="material-symbols-outlined login-field-icon"
                      aria-hidden="true"
                    >
                      lock
                    </span>
                    <input
                      className="login-input has-password-toggle"
                      id="new-password"
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      required
                      type={isNewPasswordVisible ? "text" : "password"}
                      value={newPassword}
                    />
                    <button
                      className="login-password-toggle"
                      type="button"
                      aria-label={
                        isNewPasswordVisible
                          ? "Hide new password"
                          : "Show new password"
                      }
                      onClick={() =>
                        setIsNewPasswordVisible((current) => !current)
                      }
                    >
                      <span className="material-symbols-outlined">
                        {isNewPasswordVisible
                          ? "visibility_off"
                          : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="login-field">
                  <label className="login-label" htmlFor="confirm-password">
                    Confirm New Password
                  </label>
                  <div className="login-input-wrap">
                    <span
                      className="material-symbols-outlined login-field-icon"
                      aria-hidden="true"
                    >
                      lock_reset
                    </span>
                    <input
                      className="login-input has-password-toggle"
                      id="confirm-password"
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Confirm new password"
                      required
                      type={isConfirmPasswordVisible ? "text" : "password"}
                      value={confirmPassword}
                    />
                    <button
                      className="login-password-toggle"
                      type="button"
                      aria-label={
                        isConfirmPasswordVisible
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      onClick={() =>
                        setIsConfirmPasswordVisible((current) => !current)
                      }
                    >
                      <span className="material-symbols-outlined">
                        {isConfirmPasswordVisible
                          ? "visibility_off"
                          : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  className="login-submit"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span
                      className="login-spinner"
                      aria-label="Updating password"
                    />
                  ) : (
                    "Reset Password"
                  )}
                </button>

                <div style={{ textAlign: "center", marginTop: "8px" }}>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--login-outline)",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                    onClick={handleBackToLogin}
                  >
                    ← Back to Login
                  </button>
                </div>
              </form>
            )}

            <div className="login-card-security">
              <span className="material-symbols-outlined" aria-hidden="true">
                verified_user
              </span>
              <p>Authorized Personnel Only</p>
            </div>
          </section>

          <nav className="login-footer" aria-label="Login support links">
            {["Support", "Privacy Policy", "System Status"].map((link) => (
              <a
                href={`#${link.toLowerCase().replaceAll(" ", "-")}`}
                key={link}
              >
                {link}
              </a>
            ))}
          </nav>
        </div>
      </main>

      {isRoleModalOpen && (
        <div className="role-modal-root" role="presentation">
          <button
            className="role-modal-overlay"
            type="button"
            aria-label="Close role selection"
            onClick={() => setIsRoleModalOpen(false)}
          />
          <section
            className="role-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
          >
            <div className="role-modal-header">
              <h4 id="role-modal-title">Select Your Role</h4>
              <button
                className="role-modal-close"
                type="button"
                aria-label="Close role selection"
                onClick={() => setIsRoleModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="role-grid">
              {roles.map((role) => (
                <button
                  className="role-option"
                  key={role.key}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role);
                    setIsRoleModalOpen(false);
                  }}
                >
                  <span className="role-option-icon">
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      {role.icon}
                    </span>
                  </span>
                  <span className="role-option-copy">
                    <p className="role-option-name">{role.modalLabel}</p>
                    <p className="role-option-subtitle">{role.subtitle}</p>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default StaffLogin;
