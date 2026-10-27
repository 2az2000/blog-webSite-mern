/** The Dispatch's e-mails: the confirmation, and an issue. English, like the site's base edition. */
import { env } from "../../config/env.js";
import type { MailMessage } from "./email.service.js";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const base = () => env.webAppUrl.replace(/\/$/, "");

export const confirmUrl = (token: string): string => `${base()}/newsletter/confirm?token=${encodeURIComponent(token)}`;
export const manageUrl = (token: string): string => `${base()}/newsletter/manage?token=${encodeURIComponent(token)}`;
/** The one-click endpoint mail clients call for "unsubscribe" (RFC 8058). It lives on the API, behind the site's own /api proxy. */
export const oneClickUrl = (token: string): string => `${base()}/api/v1/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

const frame = (inner: string): string =>
  `<!doctype html><html lang="en"><body style="margin:0;background:#F7F6F2;font-family:Georgia,'Times New Roman',serif;color:#111111">
  <div style="max-width:36rem;margin:0 auto;padding:2rem 1.25rem;background:#FFFFFF">
  <p style="font:700 22px Georgia,serif;margin:0 0 1.5rem">NOVA<span style="color:#1B3BFF">.</span></p>
  ${inner}
  </div></body></html>`;

export function confirmationMail(to: string, token: string): MailMessage {
  const url = confirmUrl(token);
  return {
    to,
    subject: "Confirm your NOVA Dispatch subscription",
    text: [
      "Someone — we hope you — asked for the NOVA Dispatch to be sent to this address.",
      "",
      "Confirm and it starts arriving:",
      url,
      "",
      "The link works for seven days. If you did not ask for this, ignore this e-mail and nothing will be sent.",
    ].join("\n"),
    html: frame(
      `<h1 style="font-size:24px;font-weight:600;margin:0 0 1rem">One more step</h1>
       <p style="font:16px/1.6 Arial,sans-serif">Someone — we hope you — asked for the NOVA Dispatch to be sent to this address.</p>
       <p style="margin:1.5rem 0"><a href="${esc(url)}" style="background:#111111;color:#FFFFFF;padding:12px 24px;text-decoration:none;font:600 15px Arial,sans-serif;border-radius:4px">Confirm my subscription</a></p>
       <p style="font:13px/1.6 Arial,sans-serif;color:#5C5A55">The link works for seven days. If you did not ask for this, ignore this e-mail and nothing will be sent.</p>`,
    ),
  };
}

export interface IssueStory {
  title: string;
  standfirst: string;
  author: string;
  mins: number;
  url: string;
}

export function issueMail(
  to: string,
  token: string,
  issue: { subject: string; note: string },
  stories: IssueStory[],
): MailMessage {
  const manage = manageUrl(token);
  const paragraphs = issue.note.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const text = [
    issue.subject,
    "",
    ...paragraphs.flatMap((p) => [p, ""]),
    ...stories.flatMap((s, i) => [`${i + 1}. ${s.title}`, `   ${s.standfirst}`, `   ${s.author} · ${s.mins} min read`, `   ${s.url}`, ""]),
    "—",
    `Change what you get, or leave: ${manage}`,
  ].join("\n");

  const html = frame(
    `<h1 style="font-size:26px;line-height:1.2;font-weight:600;margin:0 0 1rem">${esc(issue.subject)}</h1>
     ${paragraphs.map((p) => `<p style="font:16px/1.6 Georgia,serif;margin:0 0 1rem">${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}
     ${stories
       .map(
         (s) => `<div style="border-top:1px solid #E5E3DC;padding:1.25rem 0">
           <a href="${esc(s.url)}" style="color:#111111;text-decoration:none;font:600 20px/1.3 Georgia,serif">${esc(s.title)}</a>
           <p style="font:15px/1.55 Arial,sans-serif;color:#33312D;margin:.5rem 0">${esc(s.standfirst)}</p>
           <p style="font:12px Arial,sans-serif;color:#5C5A55;margin:0">${esc(s.author)} · ${s.mins} min read</p></div>`,
       )
       .join("")}
     <p style="font:12px/1.6 Arial,sans-serif;color:#8A8780;border-top:1px solid #E5E3DC;padding-top:1rem;margin-top:1rem">
       You get this because you subscribed to the NOVA Dispatch.
       <a href="${esc(manage)}" style="color:#1B3BFF">Change what you get, or leave</a> — one click.</p>`,
  );

  return {
    to,
    subject: issue.subject,
    text,
    html,
    headers: {
      "List-Unsubscribe": `<${oneClickUrl(token)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
