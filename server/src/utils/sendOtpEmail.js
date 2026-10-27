const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const sanitizeProviderError = (value) => String(value || "")
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
  .replace(/\b\d{6}\b/g, "[redacted code]")
  .slice(0, 300);

const getBrevoErrorDetail = async (response) => {
  try {
    const payload = await response.clone().json();
    return sanitizeProviderError(payload?.message || payload?.code || "");
  } catch {
    try {
      return sanitizeProviderError(await response.text());
    } catch {
      return "";
    }
  }
};

export const sendOtpEmail = async (to, subject, html) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Clinic Connect";

  if (!apiKey || !senderEmail) {
    console.error("Brevo OTP email configuration is incomplete.");
    throw new Error("OTP email delivery is not configured.");
  }

  let response;
  try {
    response = await globalThis.fetch(BREVO_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
  } catch (error) {
    console.error(
      "Brevo OTP email network request failed:",
      sanitizeProviderError(error?.message),
    );
    throw new Error("Unable to send OTP email.");
  }

  if (!response.ok) {
    const detail = await getBrevoErrorDetail(response);
    console.error(
      `Brevo OTP email request failed with status ${response.status}${detail ? `: ${detail}` : ""}`,
    );
    throw new Error("Unable to send OTP email.");
  }
};
