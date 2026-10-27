import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PATIENT_OTP_RESEND_COOLDOWN_SECONDS,
  resendPatientOtp,
  sendPatientOtp,
} from "../../services/authService";
import useAuth from "../../hooks/useAuth";
import "../../styles/login.css";
import CompleteProfile from "./CompleteProfile";
import useAppointmentFlow from "../../hooks/useAppointmentFlow";
import { useAppointmentBooking } from "../../context/AppointmentBookingContext";
import { usePendingReview } from "../../context/PendingReviewContext";

const STEPS = {
  LOGIN: "LOGIN",
  OTP: "OTP",
  REGISTER: "REGISTER",
};

const OTP_DURATION = 5 * 60;
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

function PatientLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingAppointment, isPending, clearAppointment } = useAppointmentBooking();
  const { isPending: hasReviewPending } = usePendingReview();
  const {
    clearRegistrationSession,
    patientLogin,
    saveRegistrationSession,
    getRegistrationSession,
  } = useAuth();
  const { completePendingAppointment, bookingLoading, bookingError } =
    useAppointmentFlow();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(STEPS.LOGIN);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const otpInputRef = useRef(null);

  const startOtpTimers = () => {
    setOtp("");
    setOtpExpiresIn(OTP_DURATION);
    setResendIn(PATIENT_OTP_RESEND_COOLDOWN_SECONDS);
  };

  useEffect(() => {
    const regSession = getRegistrationSession();

    if (location.pathname === "/login/verify") {
      const knownEmail =
        pendingAppointment?.email ||
        regSession?.email ||
        location.state?.email ||
        "";

      if (knownEmail) {
        setEmail(knownEmail);
      }
      setStep(STEPS.OTP);
      if (otpExpiresIn === 0) {
        startOtpTimers();
      }
    } else if (location.pathname === "/login") {
      // If user intentionally clicked the normal Login button, clear stale booking/registration state
      // but preserve pending review when arriving from the review form
      if (location.state?.fromNormalLogin) {
        clearRegistrationSession();
        clearAppointment();
        setEmail("");
        setOtp("");
        setOtpExpiresIn(0);
        setResendIn(0);
        setMessage("");
        setStep(STEPS.LOGIN);
        return;
      }

      // Coming from the review form — keep pending review, just proceed to login
      if (location.state?.fromReview) {
        setStep(STEPS.LOGIN);
        return;
      }

      if (regSession?.registrationToken) {
        if (regSession.email) setEmail(regSession.email);
        setStep(STEPS.REGISTER);
      } else {
        setStep(STEPS.LOGIN);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (step !== STEPS.OTP || otpExpiresIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setOtpExpiresIn((current) => Math.max(current - 1, 0));
      if (otpExpiresIn <= 1) setOtp("");
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpExpiresIn, step]);

  useEffect(() => {
    if (step !== STEPS.OTP || resendIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendIn, step]);

  useEffect(() => {
    if (step === STEPS.OTP) {
      otpInputRef.current?.focus();
    }
  }, [step]);

  const handleSendOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage("Enter your email address to continue.");
      return;
    }

    try {
      setIsSendingOtp(true);
      setMessage("");

      const response =
        step === STEPS.OTP
          ? await resendPatientOtp(normalizedEmail)
          : await sendPatientOtp(normalizedEmail);

      if (response.isNewPatient) {
        saveRegistrationSession(normalizedEmail, response.registrationToken);
        setStep(STEPS.REGISTER);
        navigate("/login");
        return;
      }

      setStep(STEPS.OTP);
      startOtpTimers();
      setMessage(
        step === STEPS.OTP
          ? "We've sent a new 6-digit verification code to your email."
          : "We've sent a 6-digit verification code to your email.",
      );
      if (location.pathname !== "/login/verify") {
        navigate("/login/verify");
      }
    } catch (error) {
      const serverMessage = error.response?.data?.message;
      const cooldownMatch = serverMessage?.match(/wait\s+(\d+)\s+seconds/i);

      if (cooldownMatch) setResendIn(Number(cooldownMatch[1]));

      setMessage(
        serverMessage ||
          "We couldn't send a verification code. Please try again.",
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (step !== STEPS.OTP) {
      handleSendOtp();
      return;
    }

    if (otpExpiresIn === 0) {
      setMessage("Verification code expired. Please request a new one.");
      return;
    }

    if (otp.length !== 6) {
      setMessage("Enter the 6-digit verification code sent to your email.");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");

      await patientLogin(email.trim().toLowerCase(), otp);

      // If there is a pending review but no pending appointment,
      // redirect to the landing page so the review auto-submits
      if (hasReviewPending && !isPending) {
        navigate("/#contact", { replace: true });
        return;
      }

      // isNewPatient: if there was a registration session, they just registered
      const wasNewPatient = !!getRegistrationSession()?.registrationToken;
      await completePendingAppointment({ isNewPatient: wasNewPatient });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "We couldn't verify that code. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegistrationSuccess = () => {
    const { email: registrationEmail } = getRegistrationSession();

    if (registrationEmail) {
      setEmail(registrationEmail);
    }

    setOtp("");
    setStep(STEPS.OTP);
    startOtpTimers();

    setMessage(
      "Registration completed successfully. Please verify the OTP sent to your email."
    );
    navigate("/login/verify");
  };

  const handleBackToLogin = () => {
    clearRegistrationSession();
    setEmail("");
    setOtp("");
    setOtpExpiresIn(0);
    setResendIn(0);
    setMessage("");
    setStep(STEPS.LOGIN);
    navigate("/login");
  };

  const handleBackNavigation = () => {
    if (isPending) {
      navigate("/#book");
    } else if (hasReviewPending) {
      navigate("/#contact");
    } else {
      navigate("/");
    }
  };

  const isRegistering = step === STEPS.REGISTER;
  const isOtpExpired = step === STEPS.OTP && otpExpiresIn === 0;
  const displayedMessage = isOtpExpired
    ? "Verification code expired. Please request a new one."
    : message;

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
            <button
              type="button"
              className="login-back-btn"
              onClick={handleBackNavigation}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-primary, #0284c7)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                marginBottom: "1rem",
                fontWeight: 500,
                fontSize: "0.875rem",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>
                arrow_back
              </span>
              {isPending ? "Back to Appointment Form" : "Back to Home"}
            </button>

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
                {isRegistering ? "Complete Registration" : "Welcome Back"}
              </h3>
              <p className="login-card-subtitle">
                {isRegistering
                  ? "Complete your profile to continue."
                  : "Login to access your patient portal"}
              </p>
            </div>

            {displayedMessage && (
              <p className="login-card-subtitle" style={{ color: "var(--color-primary, #0284c7)", marginTop: "0.5rem" }} role="status">
                {displayedMessage}
              </p>
            )}

            {isRegistering ? (
              <CompleteProfile
                onBack={handleBackToLogin}
                onComplete={handleRegistrationSuccess}
              />
            ) : (
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="login-field">
                  <label className="login-label" htmlFor="patient-email">
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
                      disabled={step === STEPS.OTP}
                      id="patient-email"
                      inputMode="email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="e.g. john.doe@example.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                {step === STEPS.OTP && (
                  <>
                    <div className="login-field">
                      <label className="login-label" htmlFor="patient-otp">
                        OTP
                      </label>
                      <div className="login-input-wrap">
                        <span
                          className="material-symbols-outlined login-field-icon"
                          aria-hidden="true"
                        >
                          lock
                        </span>
                        <input
                          className="login-input"
                          id="patient-otp"
                          inputMode="numeric"
                          maxLength="6"
                          onChange={(event) =>
                            setOtp(event.target.value.replace(/\D/g, ""))
                          }
                          placeholder="Enter 6-digit OTP"
                          ref={otpInputRef}
                          required
                          type="text"
                          value={otp}
                        />
                      </div>
                    </div>
                    <p className="login-card-subtitle" role="status">
                      {isOtpExpired
                        ? "OTP Expired"
                        : `OTP expires in ${formatTime(otpExpiresIn)}`}
                    </p>
                  </>
                )}

                {bookingError && (
                  <p className="login-card-subtitle" role="alert" style={{ color: "#ef4444" }}>
                    {bookingError}
                  </p>
                )}
                <button
                  className="login-submit"
                  disabled={
                    isSendingOtp || (step === STEPS.OTP && resendIn > 0)
                  }
                  type="button"
                  onClick={handleSendOtp}
                >
                  {isSendingOtp ? (
                    <span
                      className="login-spinner"
                      aria-label={
                        step === STEPS.OTP ? "Resending OTP" : "Sending OTP"
                      }
                    />
                  ) : step === STEPS.OTP && resendIn > 0 ? (
                    `Resend OTP in ${resendIn}s`
                  ) : step === STEPS.OTP ? (
                    "Resend OTP"
                  ) : (
                    "Send OTP"
                  )}
                </button>

                {step === STEPS.OTP && (
                  <button
                    className="login-submit"
                    disabled={isSubmitting || bookingLoading || isOtpExpired}
                    type="submit"
                  >
                    {isSubmitting || bookingLoading ? (
                      <span
                        className="login-spinner"
                        aria-label="Completing Login"
                      />
                    ) : (
                      "Verify OTP"
                    )}{" "}
                  </button>
                )}
              </form>
            )}

            <div className="login-card-security">
              <span className="material-symbols-outlined" aria-hidden="true">
                verified_user
              </span>
              <p>Secure Patient Access</p>
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
    </div>
  );
}

export default PatientLogin;
