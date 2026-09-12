// =========================================================
// WARRANTY VAULT EMAIL SERVICE
// =========================================================
// Uses Resend HTTPS API instead of SMTP/Nodemailer.
//
// Render Free blocks outbound SMTP ports 25, 465 and 587,
// so Gmail SMTP cannot be used from the free Render service.
//
// Required Render environment variable:
// RESEND_API_KEY
//
// Optional Render environment variable:
// RESEND_FROM_EMAIL
//
// For initial testing, Resend provides:
// onboarding@resend.dev
//
// IMPORTANT:
// The resend.dev test sender can only send testing emails
// to the email address associated with your Resend account.
// For sending to other users, verify your own domain in
// Resend and then set RESEND_FROM_EMAIL to an address
// on that verified domain.
// =========================================================

const RESEND_API_URL =
  "https://api.resend.com/emails";

const RESEND_DOMAINS_URL =
  "https://api.resend.com/domains";

const getResendApiKey = () =>
  process.env.RESEND_API_KEY || "";

const getFromEmail = () =>
  process.env.RESEND_FROM_EMAIL ||
  "onboarding@resend.dev";

// =========================================================
// VERIFY EMAIL CONNECTION
// =========================================================

const verifyEmailConnection =
  async () => {
    const apiKey =
      getResendApiKey();

    if (!apiKey) {
      console.error(
        "Email service configuration failed: RESEND_API_KEY is missing."
      );

      return false;
    }

    try {
      const response =
        await fetch(
          RESEND_DOMAINS_URL,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${apiKey}`,
            },
          }
        );

      const result =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        console.error(
          "Email service connection failed:",
          result?.message ||
            `HTTP ${response.status}`
        );

        return false;
      }

      console.log(
        "Email service connected successfully through Resend"
      );

      return true;
    } catch (error) {
      console.error(
        "Email service connection failed:",
        error?.message ||
          error
      );

      return false;
    }
  };

// =========================================================
// BASIC EMAIL
// =========================================================

const sendEmail =
  async ({
    to,
    subject,
    html,
  }) => {
    try {
      const apiKey =
        getResendApiKey();

      if (!apiKey) {
        return {
          success: false,

          error:
            "RESEND_API_KEY is not configured on the backend.",
        };
      }

      if (!to) {
        return {
          success: false,

          error:
            "Recipient email address is missing.",
        };
      }

      if (!subject) {
        return {
          success: false,

          error:
            "Email subject is missing.",
        };
      }

      if (!html) {
        return {
          success: false,

          error:
            "Email HTML content is missing.",
        };
      }

      const response =
        await fetch(
          RESEND_API_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${apiKey}`,
            },

            body: JSON.stringify({
              from:
                `Warranty Vault <${getFromEmail()}>`,

              to: [to],

              subject,

              html,
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        const errorMessage =
          result?.message ||
          result?.name ||
          `Resend request failed with HTTP ${response.status}`;

        console.error(
          "EMAIL ERROR:",
          errorMessage
        );

        return {
          success: false,

          error:
            errorMessage,

          status:
            response.status,
        };
      }

      console.log(
        "EMAIL SENT:",
        result?.id ||
          "Resend accepted the email"
      );

      return {
        success: true,

        messageId:
          result?.id || "",
      };
    } catch (error) {
      console.error(
        "EMAIL ERROR:",
        error?.message ||
          error
      );

      return {
        success: false,

        error:
          error?.message ||
          "Unable to send email.",
      };
    }
  };

// =========================================================
// WARRANTY SAVED CONFIRMATION EMAIL
// =========================================================
// Sent immediately after a warranty/product is saved.
// This is NOT an expiry reminder.
// =========================================================

const sendWarrantySavedConfirmationEmail =
  async ({
    user,
    warranty,
  }) => {
    const userName =
      user?.name ||
      "there";

    const userEmail =
      user?.email ||
      "";

    const productName =
      warranty?.productName ||
      "Your product";

    const brand =
      warranty?.brand ||
      "Not provided";

    const warrantyStartDate =
      warranty?.warrantyStartDate
        ? new Date(
            warranty.warrantyStartDate
          ).toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }
          )
        : "Not provided";

    const warrantyEndDate =
      warranty?.warrantyEndDate
        ? new Date(
            warranty.warrantyEndDate
          ).toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }
          )
        : "Not provided";

    const warrantyDuration =
      warranty?.warrantyDuration ||
      "Not provided";

    const subject =
      `Warranty saved: ${productName}`;

    const html = `
      <div style="
        margin:0;
        padding:40px 20px;
        background:#f8fafc;
        font-family:Arial, Helvetica, sans-serif;
      ">

        <div style="
          max-width:620px;
          margin:0 auto;
          background:#ffffff;
          border:1px solid #e2e8f0;
          border-radius:24px;
          overflow:hidden;
        ">

          <div style="
            background:#0f172a;
            padding:30px;
            text-align:center;
          ">

            <div style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              width:58px;
              height:58px;
              border-radius:17px;
              background:#7c3aed;
              color:#ffffff;
              font-size:27px;
              font-weight:bold;
            ">
              ✓
            </div>

            <h1 style="
              margin:18px 0 0;
              color:#ffffff;
              font-size:25px;
            ">
              Warranty Vault
            </h1>

            <p style="
              margin:8px 0 0;
              color:#cbd5e1;
              font-size:14px;
            ">
              Warranty saved successfully
            </p>

          </div>

          <div style="
            padding:34px;
          ">

            <h2 style="
              margin:0;
              color:#0f172a;
              font-size:22px;
            ">
              Your warranty is now protected
            </h2>

            <p style="
              margin-top:16px;
              color:#475569;
              line-height:1.7;
              font-size:15px;
            ">
              Hello <strong>${userName}</strong>,
            </p>

            <p style="
              color:#475569;
              line-height:1.7;
              font-size:15px;
            ">
              Your product has been successfully added
              to your <strong>Warranty Vault</strong>.
              We’ll keep the warranty information ready
              for your future reference and expiry reminders.
            </p>

            <div style="
              margin:24px 0;
              padding:22px;
              background:#f8fafc;
              border:1px solid #e2e8f0;
              border-radius:18px;
            ">

              <p style="
                margin:0 0 16px;
                color:#7c3aed;
                font-size:12px;
                font-weight:bold;
                text-transform:uppercase;
                letter-spacing:0.7px;
              ">
                Product details
              </p>

              <p style="
                margin:0 0 12px;
                color:#0f172a;
                font-size:16px;
              ">
                <strong>Product:</strong>
                ${productName}
              </p>

              <p style="
                margin:0 0 12px;
                color:#475569;
                font-size:14px;
              ">
                <strong>Brand:</strong>
                ${brand}
              </p>

              <p style="
                margin:0 0 12px;
                color:#475569;
                font-size:14px;
              ">
                <strong>Warranty starts:</strong>
                ${warrantyStartDate}
              </p>

              <p style="
                margin:0 0 12px;
                color:#475569;
                font-size:14px;
              ">
                <strong>Warranty ends:</strong>
                ${warrantyEndDate}
              </p>

              <p style="
                margin:0;
                color:#475569;
                font-size:14px;
              ">
                <strong>Duration:</strong>
                ${warrantyDuration}
              </p>

            </div>

            <div style="
              margin-top:22px;
              padding:18px;
              background:#f5f3ff;
              border:1px solid #ddd6fe;
              border-radius:16px;
            ">

              <p style="
                margin:0;
                color:#5b21b6;
                font-size:13px;
                line-height:1.7;
              ">
                Your warranty information is now saved.
                Warranty Vault will also send important
                expiry reminders according to your email
                notification settings.
              </p>

            </div>

            <p style="
              margin-top:26px;
              color:#64748b;
              line-height:1.7;
              font-size:13px;
            ">
              This is an automatic confirmation email
              from Warranty Vault.
            </p>

          </div>

          <div style="
            padding:24px 34px;
            border-top:1px solid #e2e8f0;
            color:#94a3b8;
            font-size:12px;
            line-height:1.6;
          ">

            <strong style="color:#64748b;">
              Warranty Vault
            </strong>

            <br/>

            Secure Warranty Management

            <br/>

            Warranty saved confirmation

          </div>

        </div>

      </div>
    `;

    return sendEmail({
      to: userEmail,
      subject,
      html,
    });
  };

// =========================================================
// WARRANTY REMINDER EMAIL
// =========================================================

const sendWarrantyReminder =
  async ({
    user,
    warranty,
    reminderType,
    remainingText,
  }) => {
    const productName =
      warranty?.productName ||
      "Your product";

    const brand =
      warranty?.brand ||
      "Unknown brand";

    const warrantyEndDate =
      warranty?.warrantyEndDate
        ? new Date(
            warranty.warrantyEndDate
          ).toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }
          )
        : "Not available";

    let subject;

    if (
      reminderType ===
      "0-day"
    ) {
      subject =
        `Important: ${productName} warranty expires today`;
    } else if (
      reminderType ===
      "1-day"
    ) {
      subject =
        `Important: ${productName} warranty expires tomorrow`;
    } else {
      subject =
        `Warranty reminder: ${productName} has ${remainingText} left`;
    }

    const html = `
      <div style="
        font-family: Arial, sans-serif;
        background: #f8fafc;
        padding: 30px;
      ">

        <div style="
          max-width: 600px;
          margin: auto;
          background: white;
          border-radius: 20px;
          padding: 30px;
          border: 1px solid #e2e8f0;
        ">

          <h1 style="
            color: #0f172a;
            margin-bottom: 8px;
          ">
            Warranty Vault
          </h1>

          <p style="
            color: #7c3aed;
            font-weight: bold;
          ">
            Warranty Reminder
          </p>

          <p>
            Hello ${user?.name || "there"},
          </p>

          <p style="
            color:#475569;
            line-height:1.6;
          ">
            Your warranty for
            <strong>${productName}</strong>
            ${
              remainingText ===
              "expires today"
                ? "expires today."
                : `has ${remainingText} remaining.`
            }
          </p>

          <div style="
            background:#f8fafc;
            border-radius:16px;
            padding:20px;
            margin:20px 0;
          ">

            <p>
              <strong>Product:</strong>
              ${productName}
            </p>

            <p>
              <strong>Brand:</strong>
              ${brand}
            </p>

            <p>
              <strong>Warranty ends:</strong>
              ${warrantyEndDate}
            </p>

            <p>
              <strong>Time remaining:</strong>
              ${remainingText}
            </p>

          </div>

          <p style="
            color:#475569;
            line-height:1.6;
          ">
            Please check your warranty documents
            and take any necessary action before
            the warranty expires.
          </p>

          <div style="
            margin-top:30px;
            padding-top:20px;
            border-top:1px solid #e2e8f0;
            color:#94a3b8;
            font-size:13px;
          ">
            Warranty Vault<br/>
            Secure Warranty Management
          </div>

        </div>

      </div>
    `;

    const result =
      await sendEmail({
        to: user?.email || "",
        subject,
        html,
      });

    if (!result.success) {
      throw new Error(
        result.error ||
          "Unable to send warranty reminder"
      );
    }

    return result;
  };

// =========================================================
// LOGIN CONFIRMATION EMAIL
// =========================================================

const sendLoginConfirmationEmail =
  async ({ user }) => {
    const userName =
      user?.name ||
      "there";

    const userEmail =
      user?.email ||
      "";

    const loginTime =
      new Date().toLocaleString(
        "en-IN",
        {
          dateStyle: "full",
          timeStyle: "short",
        }
      );

    const subject =
      "You’re signed in to Warranty Vault";

    const html = `
      <div style="
        margin:0;
        padding:40px 20px;
        background:#f8fafc;
        font-family:Arial, Helvetica, sans-serif;
      ">

        <div style="
          max-width:620px;
          margin:0 auto;
          background:#ffffff;
          border:1px solid #e2e8f0;
          border-radius:24px;
          overflow:hidden;
        ">

          <div style="
            background:#0f172a;
            padding:30px;
            text-align:center;
          ">

            <div style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              width:56px;
              height:56px;
              border-radius:16px;
              background:#7c3aed;
              color:#ffffff;
              font-size:26px;
              font-weight:bold;
            ">
              ✓
            </div>

            <h1 style="
              margin:18px 0 0;
              color:#ffffff;
              font-size:25px;
            ">
              Warranty Vault
            </h1>

            <p style="
              margin:8px 0 0;
              color:#cbd5e1;
              font-size:14px;
            ">
              Account confirmation
            </p>

          </div>

          <div style="
            padding:34px;
          ">

            <h2 style="
              margin:0;
              color:#0f172a;
              font-size:22px;
            ">
              You’re successfully signed in
            </h2>

            <p style="
              margin-top:16px;
              color:#475569;
              line-height:1.7;
              font-size:15px;
            ">
              Hello <strong>${userName}</strong>,
            </p>

            <p style="
              color:#475569;
              line-height:1.7;
              font-size:15px;
            ">
              You have successfully logged in to
              <strong>Warranty Vault</strong> using
              this email address:
            </p>

            <div style="
              margin:24px 0;
              padding:20px;
              background:#f8fafc;
              border:1px solid #e2e8f0;
              border-radius:16px;
            ">

              <p style="
                margin:0 0 8px;
                color:#64748b;
                font-size:12px;
                font-weight:bold;
              ">
                REGISTERED EMAIL
              </p>

              <p style="
                margin:0;
                color:#0f172a;
                font-size:16px;
                font-weight:bold;
              ">
                ${userEmail}
              </p>

            </div>

            <div style="
              margin:20px 0;
              padding:18px;
              background:#faf5ff;
              border:1px solid #e9d5ff;
              border-radius:16px;
            ">

              <p style="
                margin:0 0 6px;
                color:#6b21a8;
                font-size:12px;
                font-weight:bold;
              ">
                LOGIN CONFIRMED
              </p>

              <p style="
                margin:0;
                color:#581c87;
                font-size:14px;
              ">
                ${loginTime}
              </p>

            </div>

            <p style="
              color:#475569;
              line-height:1.7;
              font-size:15px;
            ">
              We’ll use this email to send important
              information about your saved products,
              including warranty reminders and
              expiration dates.
            </p>

            <div style="
              margin-top:26px;
              padding:18px;
              background:#fff7ed;
              border:1px solid #fed7aa;
              border-radius:16px;
            ">

              <p style="
                margin:0;
                color:#9a3412;
                font-size:13px;
                line-height:1.6;
              ">
                If you did not sign in to Warranty Vault,
                please secure your account and change
                your password.
              </p>

            </div>

          </div>

          <div style="
            padding:24px 34px;
            border-top:1px solid #e2e8f0;
            color:#94a3b8;
            font-size:12px;
            line-height:1.6;
          ">

            <strong style="color:#64748b;">
              Warranty Vault
            </strong>

            <br/>

            Secure Warranty Management

            <br/>

            This is an automatic account email.

          </div>

        </div>

      </div>
    `;

    return sendEmail({
      to: userEmail,
      subject,
      html,
    });
  };

// =========================================================
// EXPORT
// =========================================================

// Kept for compatibility with existing imports.
// The application no longer uses a Nodemailer transporter.
const transporter = null;

module.exports = {
  transporter,
  verifyEmailConnection,
  sendEmail,
  sendWarrantySavedConfirmationEmail,
  sendWarrantyReminder,
  sendLoginConfirmationEmail,
};