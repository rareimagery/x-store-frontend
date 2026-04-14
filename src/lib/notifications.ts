import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SMTP_HOST = process.env.SMTP_HOST || "smtp-relay.brevo.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const EMAIL_FROM =
  process.env.EMAIL_FROM || "notifications@rareimagery.net";
const ADMIN_EMAIL =
  process.env.CONSOLE_ADMIN_EMAIL || "admin@rareimagery.net";

const TELNYX_API_KEY = process.env.TELNYX_API_KEY || "";
const TELNYX_FROM_NUMBER = process.env.TELNYX_FROM_NUMBER || "";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";

// ---------------------------------------------------------------------------
// Email transport (lazy-initialized)
// ---------------------------------------------------------------------------

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth:
        SMTP_USER && SMTP_PASS
          ? { user: SMTP_USER, pass: SMTP_PASS }
          : undefined,
    });
  }
  return _transporter;
}

// ---------------------------------------------------------------------------
// Send email
// ---------------------------------------------------------------------------

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  if (!SMTP_USER) {
    console.warn("SMTP not configured — skipping email:", opts.subject);
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: `"RareImagery" <${EMAIL_FROM}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return true;
  } catch (err) {
    console.error("Email send failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Send SMS via Telnyx
// ---------------------------------------------------------------------------

export async function sendSMS(
  to: string,
  message: string
): Promise<boolean> {
  if (!TELNYX_API_KEY || !TELNYX_FROM_NUMBER) {
    console.warn("Telnyx not configured — skipping SMS to", to);
    return false;
  }

  try {
    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TELNYX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: TELNYX_FROM_NUMBER,
        to,
        text: message,
      }),
    });

    if (!res.ok) {
      console.error("Telnyx SMS error:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("SMS send failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:20px;font-weight:700;background:linear-gradient(90deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent">RareImagery</span>
  </div>
  <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:20px;color:#fff">${title}</h1>
    ${body}
  </div>
  <p style="text-align:center;margin-top:24px;font-size:12px;color:#52525b">
    &copy; ${new Date().getFullYear()} RareImagery &middot; rareimagery.net
  </p>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Notification functions
// ---------------------------------------------------------------------------

/** Notify admin when a new store is submitted for approval. */
export async function notifyAdminNewStore(
  storeName: string,
  slug: string,
  xUsername: string,
  ownerEmail: string
): Promise<void> {
  const consoleUrl = `https://console.${BASE_DOMAIN}/console/stores`;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New store submitted: ${storeName}`,
    html: emailWrapper(
      "New Store Application",
      `<p style="color:#a1a1aa;margin:0 0 16px;line-height:1.6">
        <strong style="color:#fff">@${xUsername}</strong> just created a store and it's waiting for your approval.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
        <tr><td style="padding:8px 0;color:#71717a;font-size:14px">Store Name</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right">${storeName}</td></tr>
        <tr><td style="padding:8px 0;color:#71717a;font-size:14px">Subdomain</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right">${slug}.${BASE_DOMAIN}</td></tr>
        <tr><td style="padding:8px 0;color:#71717a;font-size:14px">X Username</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right">@${xUsername}</td></tr>
        <tr><td style="padding:8px 0;color:#71717a;font-size:14px">Owner Email</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right">${ownerEmail}</td></tr>
      </table>
      <div style="text-align:center">
        <a href="${consoleUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">Review in Console</a>
      </div>`
    ),
    text: `New store "${storeName}" by @${xUsername} (${ownerEmail}) needs approval. Review at ${consoleUrl}`,
  });
}

/** Notify store owner that their store has been approved. */
export async function notifyStoreApproved(
  ownerEmail: string,
  storeName: string,
  slug: string,
  ownerPhone?: string | null
): Promise<void> {
  const storeUrl = `https://${slug}.${BASE_DOMAIN}`;

  await sendEmail({
    to: ownerEmail,
    subject: `Your store "${storeName}" is live!`,
    html: emailWrapper(
      "Your Store is Approved!",
      `<p style="color:#a1a1aa;margin:0 0 16px;line-height:1.6">
        Great news — your store has been reviewed and approved. It's now live and accessible to everyone.
      </p>
      <div style="background:#14532d;border:1px solid #166534;border-radius:8px;padding:16px;text-align:center;margin:0 0 24px">
        <p style="margin:0;color:#4ade80;font-size:16px;font-weight:600">${slug}.${BASE_DOMAIN}</p>
      </div>
      <div style="text-align:center">
        <a href="${storeUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">View Your Store</a>
      </div>
      <p style="color:#71717a;margin:24px 0 0;font-size:13px;line-height:1.5">
        Next steps: add products, customize your theme, and share your store link on X.
      </p>`
    ),
    text: `Your store "${storeName}" is now live at ${storeUrl}`,
  });

  if (ownerPhone) {
    await sendSMS(
      ownerPhone,
      `RareImagery: Your store "${storeName}" has been approved and is now live at ${storeUrl}`
    );
  }
}

/** Notify store owner that their store has been rejected. */
export async function notifyStoreRejected(
  ownerEmail: string,
  storeName: string,
  ownerPhone?: string | null
): Promise<void> {
  await sendEmail({
    to: ownerEmail,
    subject: `Update on your store "${storeName}"`,
    html: emailWrapper(
      "Store Application Update",
      `<p style="color:#a1a1aa;margin:0 0 16px;line-height:1.6">
        We've reviewed your store application for <strong style="color:#fff">${storeName}</strong> and were unable to approve it at this time.
      </p>
      <p style="color:#a1a1aa;margin:0 0 16px;line-height:1.6">
        If you believe this was in error, please reach out to us on X at
        <a href="https://x.com/rareimagery" style="color:#818cf8">@RareImagery</a>.
      </p>`
    ),
    text: `Your store "${storeName}" was not approved. Contact @RareImagery on X if you have questions.`,
  });

  if (ownerPhone) {
    await sendSMS(
      ownerPhone,
      `RareImagery: Your store "${storeName}" application needs attention. Check your email for details.`
    );
  }
}

// ---------------------------------------------------------------------------
// X DM Notification Dispatcher (DM primary, email fallback)
// ---------------------------------------------------------------------------

import { sendDMFromPlatform, resolveXId } from "@/lib/x-api/direct-messages";

type NotificationType = "welcome" | "gate_ai" | "gate_favorites" | "sale" | "approved" | "rejected";

interface NotifyCreatorOpts {
  type: NotificationType;
  xUsername: string;
  email?: string;
  storeName?: string;
  storeSlug?: string;
  productName?: string;
  amount?: string;
  currency?: string;
}

const DM_TEMPLATES: Record<NotificationType, (opts: NotifyCreatorOpts) => string> = {
  welcome: (o) =>
    `Your @${o.storeSlug || o.xUsername}.rareimagery.net store is live! 🎉\n\nStart designing products with Grok Imagine in your console:\nhttps://www.rareimagery.net/console/design-studio`,
  gate_ai: (o) =>
    `You've used your 20 free Grok Imagine designs on @${o.storeSlug || o.xUsername}.rareimagery.net.\n\nSubscribe to @rareimagery on X to unlock unlimited AI generations:\nhttps://x.com/rareimagery/subscribe`,
  gate_favorites: (o) =>
    `You've reached 50 favorites on @${o.storeSlug || o.xUsername}.rareimagery.net.\n\nSubscribe to @rareimagery on X for unlimited favorites:\nhttps://x.com/rareimagery/subscribe`,
  sale: (o) =>
    `New sale on ${o.storeName || "your store"}! 💰\n\n${o.productName || "Product"} — ${o.currency || "$"}${o.amount || "0"}\n\nView details in your console:\nhttps://www.rareimagery.net/console/orders`,
  approved: (o) =>
    `Your store "${o.storeName || o.xUsername}" has been approved and is now live! ✅\n\nVisit: https://${o.storeSlug || o.xUsername}.rareimagery.net`,
  rejected: (o) =>
    `We were unable to approve your store "${o.storeName || o.xUsername}" at this time.\n\nReach out to @rareimagery on X if you have questions.`,
};

/**
 * Send a notification to a creator — X DM first, email fallback.
 * Fire-and-forget safe (never throws).
 */
export async function notifyCreator(opts: NotifyCreatorOpts): Promise<{ channel: "dm" | "email" | "none"; success: boolean }> {
  const dmText = DM_TEMPLATES[opts.type]?.(opts);
  if (!dmText) return { channel: "none", success: false };

  // Try X DM first
  try {
    const xId = await resolveXId(opts.xUsername);
    if (xId) {
      const result = await sendDMFromPlatform(xId, dmText);
      if (result.success) {
        console.log(`[notify] DM sent to @${opts.xUsername} (${opts.type})`);
        return { channel: "dm", success: true };
      }
      console.warn(`[notify] DM failed for @${opts.xUsername}: ${result.error}`);
    }
  } catch (err) {
    console.warn("[notify] DM error:", err);
  }

  // Fall back to email
  if (opts.email) {
    try {
      const subject = {
        welcome: `Your store is live on RareImagery!`,
        gate_ai: `Grok Imagine limit reached`,
        gate_favorites: `Favorites limit reached`,
        sale: `New sale on ${opts.storeName || "your store"}`,
        approved: `Your store "${opts.storeName}" is approved!`,
        rejected: `Update on your store "${opts.storeName}"`,
      }[opts.type];

      const sent = await sendEmail({
        to: opts.email,
        subject,
        html: emailWrapper(subject, `<p style="color:#a1a1aa;line-height:1.6">${dmText.replace(/\n/g, "<br>")}</p>`),
        text: dmText,
      });

      if (sent) {
        console.log(`[notify] Email sent to ${opts.email} (${opts.type})`);
        return { channel: "email", success: true };
      }
    } catch {}
  }

  console.warn(`[notify] All channels failed for @${opts.xUsername} (${opts.type})`);
  return { channel: "none", success: false };
}

/** Notify store owner of a new sale. */
export async function notifyNewSale(
  ownerEmail: string,
  storeName: string,
  productName: string,
  amount: string,
  currency: string,
  ownerPhone?: string | null
): Promise<void> {
  await sendEmail({
    to: ownerEmail,
    subject: `New sale on ${storeName}: ${productName}`,
    html: emailWrapper(
      "You Made a Sale!",
      `<p style="color:#a1a1aa;margin:0 0 16px;line-height:1.6">
        Someone just purchased from your store.
      </p>
      <div style="background:#1e1b4b;border:1px solid #312e81;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px">
        <p style="margin:0 0 4px;color:#c4b5fd;font-size:14px">${productName}</p>
        <p style="margin:0;color:#fff;font-size:28px;font-weight:700">${currency} ${amount}</p>
      </div>
      <p style="color:#71717a;margin:0;font-size:13px;text-align:center">
        Check your store dashboard for order details.
      </p>`
    ),
    text: `New sale on ${storeName}: ${productName} for ${currency} ${amount}`,
  });

  if (ownerPhone) {
    await sendSMS(
      ownerPhone,
      `RareImagery: New sale! ${productName} for ${currency} ${amount} on ${storeName}`
    );
  }
}
