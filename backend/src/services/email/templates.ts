/** Copy-paste of the two transactional e-mails, bilingual minimal. */
import { env } from "../../config/env.js";
import type { MailMessage } from "./email.service.js";

const shell = (title: string, bodyHtml: string): string =>
  `<!doctype html><html lang="fa" dir="rtl"><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:2rem auto;color:#111111">
  <p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#5C5A55">NOVA</p>
  <h1 style="font-size:22px;font-weight:600">${title}</h1>
  ${bodyHtml}
  <p style="font-size:12px;color:#8A8780;margin-top:2rem">اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.
  <br>If you did not request this, ignore this e-mail.</p></body></html>`;

export function verificationMail(to: string, code: string): MailMessage {
  const title = "تأیید ایمیل حساب";
  return {
    to,
    subject: `کد تأیید NOVA — ${code}`,
    text: [
      "کد تأیید ایمیل NOVA:",
      code,
      `اعتبار: ۱۰ دقیقه · NOVA verification code expires in 10 minutes.`,
    ].join("\n"),
    html: shell(
      title,
      `<p style="font-size:16px">کد تأیید زیر را در صفحه‌ی تأیید حساب وارد کنید:</p>
       <p style="font-size:34px;letter-spacing:.3em;font-family:monospace;text-align:center;background:#E8EBFF;padding:12px 8px;border-radius:4px">${code}</p>
       <p style="font-size:12px;color:#5C5A55">اعتبار کد ۱۰ دقیقه است.</p>`,
    ),
  };
}

export function passwordResetMail(to: string, token: string): MailMessage {
  const url = `${env.webAppUrl}/auth?reset=${token}#reset`;
  const title = "بازیابی رمز عبور";
  return {
    to,
    subject: "بازیابی رمز عبور NOVA",
    text: [
      "لینک بازیابی رمز عبور NOVA (اعتبار ۱ ساعت، یک‌بار مصرف):",
      url,
      `Password reset link, valid 1 hour, single use: ${url}`,
    ].join("\n"),
    html: shell(
      title,
      `<p style="font-size:16px">برای تعیین رمز تازه روی لینک زیر بزنید:</p>
       <p><a href="${url}" style="color:#1B3BFF">${url}</a></p>
       <p style="font-size:12px;color:#5C5A55">اعتبار لینک ۱ ساعت است و فقط یک‌بار قابل استفاده است.</p>`,
    ),
  };
}
