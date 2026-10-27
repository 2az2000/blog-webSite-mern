import type { Locale } from "@/i18n/config";

/*
 * The Privacy notice, the Terms and the Cookie policy. They are long, prose-shaped
 * and different in length per language, so they live here rather than in the UI
 * dictionaries (which are fixed-shape). Every statement below describes what the
 * software actually does; when the software changes, change the text and bump
 * POLICY_VERSION in config/legal.ts (and the same constant in the API).
 *
 * Wording is a good-faith draft for the publisher to have reviewed: the legal
 * entity, the contact route and the governing law are theirs to confirm.
 */

export type LegalSection = { id: string; title: string; paragraphs?: string[]; items?: string[] };

export type LegalDoc = {
  title: string;
  description: string;
  lead: string;
  sections: LegalSection[];
};

export type LegalKey = "privacy" | "terms" | "cookies";

export type CookieRow = { name: string; purpose: string; kept: string; kind: "essential" | "preferences" };

/** Every cookie and every item of local storage the site uses. Nothing else is set. */
export const COOKIE_ROWS: Record<Locale, CookieRow[]> = {
  en: [
    { name: "nova_at", purpose: "Keeps you signed in. A short-lived pass the server checks on each request; scripts on the page cannot read it.", kept: "15 minutes", kind: "essential" },
    { name: "nova_rt", purpose: "Renews that pass without asking for your password again. Sent only to the sign-in endpoints, and replaced each time it is used.", kept: "Up to 30 days", kind: "essential" },
    { name: "nova:consent", purpose: "Remembers the choice you made about this notice.", kept: "Until you change it", kind: "essential" },
    { name: "nova:bookmarks", purpose: "The stories you saved while signed out, so the Save button works. Merged into your account when you sign in.", kept: "Until you clear it", kind: "essential" },
    { name: "nova:theme", purpose: "Remembers light or dark.", kept: "Until you clear it", kind: "preferences" },
    { name: "nova:recent-searches", purpose: "Your last few searches, offered again on the search page. They never leave your device.", kept: "Until you clear it", kind: "preferences" },
  ],
  fa: [
    { name: "nova_at", purpose: "شما را وارد نگه می‌دارد. یک مجوز کوتاه‌عمر که سرور در هر درخواست بررسی می‌کند؛ اسکریپت‌های صفحه نمی‌توانند آن را بخوانند.", kept: "۱۵ دقیقه", kind: "essential" },
    { name: "nova_rt", purpose: "همان مجوز را بی‌آنکه دوباره رمز بخواهد تازه می‌کند. فقط به نشانی‌های ورود فرستاده می‌شود و با هر بار استفاده عوض می‌شود.", kept: "تا ۳۰ روز", kind: "essential" },
    { name: "nova:consent", purpose: "انتخابی را که درباره‌ی این اطلاعیه کرده‌اید به خاطر می‌سپارد.", kept: "تا وقتی عوضش کنید", kind: "essential" },
    { name: "nova:bookmarks", purpose: "مطالبی که بی‌ورود ذخیره کرده‌اید تا دکمه‌ی ذخیره کار کند. با ورود به حساب‌تان یکی می‌شود.", kept: "تا وقتی پاکش کنید", kind: "essential" },
    { name: "nova:theme", purpose: "روشن یا تاریک بودن را به خاطر می‌سپارد.", kept: "تا وقتی پاکش کنید", kind: "preferences" },
    { name: "nova:recent-searches", purpose: "چند جست‌وجوی آخر شما، برای پیشنهاد دوباره در صفحه‌ی جست‌وجو. از دستگاه شما بیرون نمی‌رود.", kept: "تا وقتی پاکش کنید", kind: "preferences" },
  ],
};

const en: Record<LegalKey, LegalDoc> = {
  privacy: {
    title: "Privacy notice",
    description: "What NOVA collects, why, who else handles it, how long we keep it, and how to see, fix or erase it.",
    lead: "NOVA is a newspaper. It should know as little about you as a newspaper can: enough to run your account, send what you asked for, and keep the site safe. This page says exactly what that is.",
    sections: [
      {
        id: "who",
        title: "Who we are",
        paragraphs: [
          "NOVA Media publishes NOVA and decides how the information described here is used. It is the “controller” of that information. You can reach the newsroom through the contact link in the footer.",
          "This notice covers the NOVA website and the NOVA Dispatch newsletter.",
        ],
      },
      {
        id: "collect",
        title: "What we collect",
        items: [
          "Your account: your name, your e-mail address, and your password, which we keep only as a salted one-way hash (we cannot read it). We also record that you accepted these terms, when, and which version of them.",
          "Where you are signed in: for each device, the browser and device name, the IP address it connected from, and when it was last used. This is what the “Devices” list in your account settings shows (without the address) and what lets us sign a device out.",
          "What you do while signed in: the stories you save, like or follow, your collections, your reading history, and the comments you write or report. A comment shows your name beside it.",
          "The Dispatch: your e-mail address, the topics and frequency you chose, when and from where you asked, which version of this notice was in force, and whether you confirmed. Each issue is recorded as sent or not, so nobody receives the same issue twice.",
          "What readers search for, as counts of the words only. We do not keep who searched.",
          "Broken-link reports: the address that did not work, and the page it came from. Not who reported it.",
        ],
      },
      {
        id: "anonymous",
        title: "Reading without an account",
        paragraphs: [
          "To know how many people read a story, we count one visit per visitor per day. For a visitor who is not signed in, that is done with a hash that mixes in a secret that changes every day, so the same person cannot be recognised from one day to the next, and the hash is not an address or a name. These daily rows are deleted after 90 days.",
          "We do not use advertising or analytics services, and no third-party scripts run on NOVA.",
        ],
      },
      {
        id: "why",
        title: "Why we use it",
        items: [
          "To provide what you asked for: your account, your saves and follows, your comments, the Dispatch. (Performing our agreement with you.)",
          "To keep the site and its readers safe: limiting repeated sign-in attempts and sign-ups by IP address for a short window, spotting a stolen session, moderating comments. (Our legitimate interest in running a safe service.)",
          "To understand what is read, so we can decide what to report. (Our legitimate interest; it uses only the daily counts above.)",
          "To send the Dispatch. (Your consent, which you can withdraw at any time from any issue, or from your account settings.)",
        ],
      },
      {
        id: "others",
        title: "Who else handles it",
        paragraphs: [
          "We use service providers who handle information only to run NOVA for us. We do not sell your information and we do not share it for advertising. At the time of writing they are:",
        ],
        items: [
          "Vercel: website and API hosting.",
          "MongoDB Atlas: the database that holds everything in “What we collect”.",
          "Resend: delivering the e-mails you ask for (verification codes, password resets, the Dispatch).",
          "Cloudinary: delivering the pictures the newsroom uploads. It sees a visitor’s address when a picture loads, as any image host does.",
          "Sentry and Upstash: technical details of a failure (never cookies, passwords or what you typed), and short-lived counters that limit repeated requests, where the publisher has switched them on.",
          "If a provider is outside your country, we rely on the safeguards the law recognises for such transfers.",
        ],
      },
      {
        id: "keep",
        title: "How long we keep it",
        items: [
          "Your account and what you did with it: until you delete your account. Deleting it removes your saves, likes, follows, collections, reading history and sign-in records, and your Dispatch subscription, at once.",
          "Your comments are removed when you delete your account. Where other people have replied, a note that the comment was removed stays so the thread still makes sense; it carries neither your name nor your words.",
          "Sign-in records: until the session expires (30 days after last use) or you sign out.",
          "Daily reading counts: 90 days.",
          "The Dispatch: until you unsubscribe. We then keep your address marked as unsubscribed so we never write to you again by mistake; ask us to erase it and we will.",
        ],
      },
      {
        id: "rights",
        title: "Your rights",
        paragraphs: ["You can, at any time and without giving a reason:"],
        items: [
          "See and take what we hold: “Download my data” in your account settings gives you a file with everything above.",
          "Correct it: change your name in your account settings.",
          "Erase it: “Delete my account” in your account settings. If you only have a newsletter subscription, unsubscribe from any issue and ask us to erase the address.",
          "Object to, or withdraw consent for, the uses that rest on them: unsubscribe from the Dispatch, or write to us.",
          "Complain to your data-protection authority if you think we have handled your information wrongly.",
        ],
      },
      {
        id: "children",
        title: "Children",
        paragraphs: ["NOVA is written for adults and is not directed at children. If you believe a child has made an account, tell us and we will remove it."],
      },
      {
        id: "changes",
        title: "Changes",
        paragraphs: ["If this notice changes in a way that matters, we will change the date above and, for anything that needs your agreement, ask you again. The date and version of each agreement you gave are recorded with it."],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    description: "The rules for reading NOVA, having an account, commenting and subscribing to the Dispatch.",
    lead: "These are the terms on which NOVA is offered. They are written to be read. By creating an account or using NOVA, you agree to them.",
    sections: [
      {
        id: "using",
        title: "Using NOVA",
        paragraphs: ["You may read NOVA, share links to it, and quote it fairly with attribution, for your own non-commercial use. You may not copy it at scale, scrape it to build a competing service, or use it to train a system without our written permission."],
      },
      {
        id: "account",
        title: "Your account",
        items: [
          "Give a real e-mail address you control, and keep your password to yourself. You are responsible for what happens under your account.",
          "You must be old enough to agree to these terms where you live, and at least 16.",
          "Tell us if you think someone else has your password, and sign the device out from your account settings.",
          "You can delete your account at any time. We may suspend or close one that breaks these terms, and we will say why where we can.",
        ],
      },
      {
        id: "comments",
        title: "Comments and what you post",
        items: [
          "You keep ownership of your comments. By posting one you give NOVA permission to publish it on the story and to keep it as part of the discussion.",
          "Write about the story and respond to people, not at them. Do not post hate, threats, harassment, other people's private information, spam, or anything unlawful.",
          "Comments that break the rules, or that readers report, may be held for a moderator to review. People decide; software only holds. A moderator may remove a comment and tells you why.",
          "You may edit a comment once. You may delete it at any time.",
        ],
      },
      {
        id: "content",
        title: "Our journalism",
        paragraphs: ["Everything NOVA publishes (text, pictures, charts, design) belongs to NOVA Media or its contributors and is protected by copyright. Our reporting is accurate to the best of our knowledge when it is published; where we are wrong we correct it and say so. Nothing on NOVA is professional, legal, medical or financial advice."],
      },
      {
        id: "dispatch",
        title: "The NOVA Dispatch",
        paragraphs: ["The Dispatch is a free e-mail newsletter. You subscribe by confirming from your inbox (or from a signed-in account), and you can change what you receive or leave from any issue in one click. We never send it to an address that has not confirmed."],
      },
      {
        id: "membership",
        title: "Membership and payments",
        paragraphs: ["NOVA is free to read today. If paid membership is offered, its price, what it includes and how to cancel will be set out before you pay, and will form part of these terms."],
      },
      {
        id: "liability",
        title: "Availability and liability",
        paragraphs: [
          "We work to keep NOVA available and correct, but we provide it as it is, without a promise that it will always be available or free of error. To the extent the law allows, NOVA Media is not liable for loss that was not a reasonably foreseeable result of our failing to take care. Nothing here limits liability that the law does not allow to be limited.",
        ],
      },
      {
        id: "changes",
        title: "Changes and law",
        paragraphs: ["We may change these terms. For a change that matters we will update the date and tell signed-in readers. Continuing to use NOVA after that means you accept the change. These terms are governed by the law of the country where NOVA Media is established, and its courts decide any dispute, without taking away rights the law gives you as a consumer where you live."],
      },
    ],
  },
  cookies: {
    title: "Cookie policy",
    description: "Every cookie and piece of local storage NOVA uses, why, and how to choose.",
    lead: "NOVA sets two cookies, both to keep you signed in, and stores a few small things in your browser. No advertising, no analytics, no tracking, and no one else’s scripts.",
    sections: [
      {
        id: "what",
        title: "What NOVA stores on your device",
        paragraphs: [
          "Two kinds. Essential items make something you asked for work (staying signed in, remembering this choice, the Save button) and are used without asking. Preference items are conveniences (light or dark, your recent searches) and are stored only if you allow them.",
        ],
      },
      {
        id: "never",
        title: "What we do not use",
        paragraphs: ["No advertising cookies. No analytics or tracking cookies, fingerprinting or cross-site identifiers. No third-party scripts, pixels or embeds: the site’s security policy forbids loading any."],
      },
      {
        id: "choose",
        title: "Your choice",
        paragraphs: ["You can accept preference storage, or keep to essential only, and change your mind at any time with “Cookie settings” in the footer or below. Choosing essential only erases any preference items already stored. The site works fully either way; without preferences it simply forgets your theme when you leave."],
      },
      {
        id: "clear",
        title: "Clearing them yourself",
        paragraphs: ["Your browser lets you see and delete cookies and site data for NOVA at any time. Signing out also ends your sign-in cookies."],
      },
    ],
  },
};

const fa: Record<LegalKey, LegalDoc> = {
  privacy: {
    title: "اطلاعیه‌ی حریم خصوصی",
    description: "NOVA چه چیزی جمع می‌کند، چرا، چه کسان دیگری با آن کار می‌کنند، چقدر نگه می‌داریم و چطور ببینید، اصلاح یا پاک کنید.",
    lead: "NOVA یک روزنامه است و باید تا جای ممکن کم درباره‌ی شما بداند: همان‌قدر که حساب شما را راه بیندازد، آنچه خواسته‌اید را بفرستد و سایت را امن نگه دارد. این صفحه دقیقاً می‌گوید آن چیست.",
    sections: [
      {
        id: "who",
        title: "ما کی هستیم",
        paragraphs: [
          "رسانه‌ی NOVA ناشر NOVA است و درباره‌ی نحوه‌ی استفاده از اطلاعاتِ توصیف‌شده در اینجا تصمیم می‌گیرد؛ یعنی «کنترل‌کننده»ی آن اطلاعات است. از پیوند «تماس» در پایین صفحه می‌توانید به تحریریه برسید.",
          "این اطلاعیه وب‌سایت NOVA و خبرنامه‌ی NOVA Dispatch را در بر می‌گیرد.",
        ],
      },
      {
        id: "collect",
        title: "چه چیزی جمع می‌کنیم",
        items: [
          "حساب شما: نام، نشانی ایمیل و رمز عبور؛ رمز را فقط به شکل یک چکیده‌ی یک‌طرفه‌ی نمک‌دار نگه می‌داریم (خودمان هم نمی‌توانیم بخوانیمش). همچنین ثبت می‌کنیم که شرایط استفاده را پذیرفته‌اید، کی و کدام نسخه.",
          "جاهایی که وارد شده‌اید: برای هر دستگاه، نام مرورگر و دستگاه، نشانی IP که از آن وصل شده و آخرین زمان استفاده. فهرست «دستگاه‌ها» در تنظیمات حساب همین را (بدون نشانی) نشان می‌دهد و ما با آن می‌توانیم یک دستگاه را خارج کنیم.",
          "کارهایی که با حساب می‌کنید: مطالبی که ذخیره، پسند یا دنبال می‌کنید، مجموعه‌ها، تاریخچه‌ی مطالعه و نظرهایی که می‌نویسید یا گزارش می‌کنید. کنار هر نظر نام شما دیده می‌شود.",
          "Dispatch: نشانی ایمیل، موضوع‌ها و تناوبی که برگزیده‌اید، زمان و محل درخواست، نسخه‌ی این اطلاعیه در آن زمان و اینکه تأیید کرده‌اید یا نه. هر شماره «فرستاده شد یا نه» ثبت می‌شود تا هیچ‌کس یک شماره را دو بار نگیرد.",
          "اینکه خواننده‌ها چه جست‌وجو می‌کنند، فقط به شکل شمارش خودِ واژه‌ها. نگه نمی‌داریم چه کسی جست‌وجو کرده.",
          "گزارش لینک خراب: نشانی که کار نکرد و صفحه‌ای که از آن آمده؛ نه اینکه چه کسی گزارش کرده.",
        ],
      },
      {
        id: "anonymous",
        title: "خواندن بدون حساب",
        paragraphs: [
          "برای دانستن اینکه چند نفر یک مطلب را خوانده‌اند، هر بازدیدکننده را در هر روز یک بار می‌شماریم. برای کسی که وارد نشده، این کار با یک چکیده انجام می‌شود که رازی را می‌آمیزد که هر روز عوض می‌شود؛ پس یک نفر از روزی به روز دیگر قابل شناسایی نیست و آن چکیده نه نشانی است و نه نام. این ردیف‌های روزانه پس از ۹۰ روز پاک می‌شوند.",
          "از خدمات تبلیغاتی یا تحلیل بازدید استفاده نمی‌کنیم و هیچ اسکریپت شخص ثالثی در NOVA اجرا نمی‌شود.",
        ],
      },
      {
        id: "why",
        title: "چرا از آن استفاده می‌کنیم",
        items: [
          "برای ارائه‌ی آنچه خواسته‌اید: حساب، ذخیره‌ها و دنبال‌کردن‌ها، نظرها، Dispatch. (اجرای توافق ما با شما)",
          "برای امن نگه‌داشتن سایت و خواننده‌ها: محدودکردن تلاش‌های پی‌درپی ورود و ثبت‌نام بر پایه‌ی IP در یک بازه‌ی کوتاه، تشخیص نشستِ دزدیده‌شده، مدیریت نظرها. (منفعت مشروع ما در اداره‌ی یک سرویس امن)",
          "برای فهمیدن اینکه چه خوانده می‌شود تا تصمیم بگیریم درباره‌ی چه گزارش کنیم. (منفعت مشروع؛ فقط از همان شمارش‌های روزانه استفاده می‌کند.)",
          "برای فرستادن Dispatch. (رضایت شما، که هر زمان از هر شماره یا از تنظیمات حساب می‌توانید پس بگیرید.)",
        ],
      },
      {
        id: "others",
        title: "چه کسان دیگری با آن کار می‌کنند",
        paragraphs: [
          "از ارائه‌دهندگانی استفاده می‌کنیم که اطلاعات را فقط برای اداره‌ی NOVA از طرف ما پردازش می‌کنند. اطلاعات شما را نمی‌فروشیم و برای تبلیغات به اشتراک نمی‌گذاریم. در زمان نوشتن این متن این‌ها هستند:",
        ],
        items: [
          "Vercel: میزبانی وب‌سایت و API.",
          "MongoDB Atlas: پایگاه‌داده‌ای که همه‌ی موارد «چه چیزی جمع می‌کنیم» در آن است.",
          "Resend: رساندن ایمیل‌هایی که می‌خواهید (کد تأیید، بازنشانی رمز، Dispatch).",
          "Cloudinary: رساندن تصویرهایی که تحریریه بارگذاری می‌کند. مثل هر میزبان تصویر، هنگام بارگیری تصویر نشانی بازدیدکننده را می‌بیند.",
          "Sentry و Upstash: جزئیات فنی یک خرابی (هرگز کوکی، رمز یا آنچه تایپ کرده‌اید) و شمارنده‌های کوتاه‌عمر که درخواست‌های پی‌درپی را محدود می‌کنند، هر جا ناشر روشنشان کرده باشد.",
          "اگر ارائه‌دهنده‌ای خارج از کشور شما باشد، به تضمین‌هایی تکیه می‌کنیم که قانون برای چنین انتقال‌هایی می‌پذیرد.",
        ],
      },
      {
        id: "keep",
        title: "چقدر نگه می‌داریم",
        items: [
          "حساب شما و آنچه با آن کرده‌اید: تا وقتی حسابتان را حذف کنید. حذف، ذخیره‌ها، پسندها، دنبال‌کردن‌ها، مجموعه‌ها، تاریخچه، سوابق ورود و اشتراک Dispatch شما را همان لحظه پاک می‌کند.",
          "نظرهای شما با حذف حساب برداشته می‌شود. جایی که دیگران پاسخ داده‌اند، یادداشتی که «نظر برداشته شد» می‌ماند تا رشته‌ی گفت‌وگو بی‌معنا نشود؛ نه نام شما در آن است نه حرف‌هایتان.",
          "سوابق ورود: تا پایان نشست (۳۰ روز پس از آخرین استفاده) یا تا خروج شما.",
          "شمارش‌های روزانه‌ی خواندن: ۹۰ روز.",
          "Dispatch: تا وقتی لغو کنید. پس از آن نشانی را با برچسب «لغوشده» نگه می‌داریم تا هرگز اشتباهی دوباره برایتان ننویسیم؛ بخواهید پاکش می‌کنیم.",
        ],
      },
      {
        id: "rights",
        title: "حق‌های شما",
        paragraphs: ["هر زمان و بدون ذکر دلیل می‌توانید:"],
        items: [
          "آنچه داریم را ببینید و بردارید: «دانلود داده‌هایم» در تنظیمات حساب، فایلی با همه‌ی موارد بالا به شما می‌دهد.",
          "اصلاحش کنید: نامتان را در تنظیمات حساب عوض کنید.",
          "پاکش کنید: «حذف حساب من» در تنظیمات حساب. اگر فقط اشتراک خبرنامه دارید، از هر شماره لغو کنید و از ما بخواهید نشانی را پاک کنیم.",
          "به استفاده‌هایی که بر رضایت یا منفعت مشروع تکیه دارند اعتراض یا رضایت را پس بگیرید: از Dispatch لغو اشتراک کنید یا به ما بنویسید.",
          "اگر فکر می‌کنید اطلاعاتتان را درست اداره نکرده‌ایم، به مرجع حفاظت از داده‌ی کشور خود شکایت کنید.",
        ],
      },
      {
        id: "children",
        title: "کودکان",
        paragraphs: ["NOVA برای بزرگسالان نوشته می‌شود و مخاطبش کودکان نیستند. اگر فکر می‌کنید کودکی حساب ساخته، به ما بگویید تا حذفش کنیم."],
      },
      {
        id: "changes",
        title: "تغییرها",
        paragraphs: ["اگر این اطلاعیه به شکلی مهم تغییر کند، تاریخ بالا را عوض می‌کنیم و برای هر چیز که به موافقت شما نیاز دارد دوباره می‌پرسیم. تاریخ و نسخه‌ی هر موافقتی که داده‌اید همراه خودش ثبت می‌شود."],
      },
    ],
  },
  terms: {
    title: "شرایط استفاده",
    description: "قاعده‌های خواندن NOVA، داشتن حساب، نظر دادن و اشتراک در Dispatch.",
    lead: "این‌ها شرط‌هایی است که NOVA بر پایه‌ی آن عرضه می‌شود. برای خوانده‌شدن نوشته شده‌اند. با ساختن حساب یا استفاده از NOVA آن‌ها را می‌پذیرید.",
    sections: [
      {
        id: "using",
        title: "استفاده از NOVA",
        paragraphs: ["می‌توانید NOVA را بخوانید، پیوندش را به اشتراک بگذارید و با ذکر منبع، به‌طور منصفانه از آن نقل کنید؛ برای استفاده‌ی شخصی و غیرتجاری. بدون اجازه‌ی کتبی ما نمی‌توانید آن را انبوه کپی کنید، برای ساخت سرویس رقیب خزش کنید یا برای آموزش یک سامانه به کار ببرید."],
      },
      {
        id: "account",
        title: "حساب شما",
        items: [
          "نشانی ایمیل واقعی که در اختیار دارید بدهید و رمزتان را پیش خودتان نگه دارید. شما مسئول آنچه با حسابتان رخ می‌دهد هستید.",
          "باید در محل زندگی خود سن پذیرفتن این شرایط را داشته باشید و دست‌کم ۱۶ ساله باشید.",
          "اگر فکر می‌کنید کسی رمزتان را دارد به ما بگویید و دستگاه را از تنظیمات حساب خارج کنید.",
          "هر زمان می‌توانید حسابتان را حذف کنید. ما ممکن است حسابی را که این شرایط را زیر پا می‌گذارد تعلیق یا ببندیم و تا جایی که بتوانیم دلیلش را می‌گوییم.",
        ],
      },
      {
        id: "comments",
        title: "نظرها و آنچه می‌فرستید",
        items: [
          "مالکیت نظرهایتان با خودتان می‌ماند. با فرستادن آن به NOVA اجازه می‌دهید آن را زیر مطلب منتشر کند و به‌عنوان بخشی از گفت‌وگو نگه دارد.",
          "درباره‌ی مطلب بنویسید و به آدم‌ها پاسخ بدهید، نه اینکه به آن‌ها حمله کنید. نفرت‌پراکنی، تهدید، آزار، اطلاعات خصوصی دیگران، هرزنامه و هر چیز غیرقانونی نفرستید.",
          "نظرهایی که قاعده‌ها را می‌شکنند یا خواننده‌ها گزارش می‌کنند ممکن است برای بررسی ناظر نگه داشته شوند. آدم‌ها تصمیم می‌گیرند؛ نرم‌افزار فقط نگه می‌دارد. ناظر ممکن است نظری را بردارد و دلیلش را به شما می‌گوید.",
          "هر نظر را یک بار می‌توانید ویرایش کنید و هر زمان می‌توانید حذفش کنید.",
        ],
      },
      {
        id: "content",
        title: "روزنامه‌نگاری ما",
        paragraphs: ["هر آنچه NOVA منتشر می‌کند (متن، تصویر، نمودار، طراحی) متعلق به رسانه‌ی NOVA یا همکارانش است و حق نشر دارد. گزارش‌های ما تا آنجا که می‌دانیم هنگام انتشار درست‌اند؛ هر جا اشتباه کنیم اصلاح می‌کنیم و می‌گوییم. هیچ چیز در NOVA مشاوره‌ی حرفه‌ای، حقوقی، پزشکی یا مالی نیست."],
      },
      {
        id: "dispatch",
        title: "خبرنامه‌ی NOVA Dispatch",
        paragraphs: ["Dispatch یک خبرنامه‌ی ایمیلی رایگان است. با تأیید از صندوق ایمیل (یا از حسابی که وارد شده‌اید) مشترک می‌شوید و از هر شماره با یک کلیک می‌توانید آنچه می‌گیرید را عوض کنید یا بروید. هرگز به نشانی تأییدنشده نمی‌فرستیم."],
      },
      {
        id: "membership",
        title: "عضویت و پرداخت",
        paragraphs: ["NOVA امروز رایگان خوانده می‌شود. اگر عضویت پولی عرضه شود، قیمت، آنچه شامل می‌شود و راه لغوش پیش از پرداخت گفته می‌شود و بخشی از همین شرایط خواهد بود."],
      },
      {
        id: "liability",
        title: "دسترس‌پذیری و مسئولیت",
        paragraphs: ["می‌کوشیم NOVA در دسترس و درست باشد، اما آن را «همان‌طور که هست» عرضه می‌کنیم، بی‌قولِ همیشه در دسترس‌بودن یا بی‌خطابودن. تا جایی که قانون اجازه می‌دهد، رسانه‌ی NOVA مسئول زیانی نیست که پیامد معقولاً قابل‌پیش‌بینیِ بی‌مراقبتی ما نباشد. هیچ چیز در اینجا مسئولیتی را که قانون اجازه‌ی محدودکردنش را نمی‌دهد محدود نمی‌کند."],
      },
      {
        id: "changes",
        title: "تغییرها و قانون حاکم",
        paragraphs: ["ممکن است این شرایط را تغییر دهیم. برای تغییر مهم، تاریخ را به‌روز می‌کنیم و به خواننده‌های واردشده خبر می‌دهیم. ادامه‌ی استفاده از NOVA پس از آن به معنای پذیرفتن تغییر است. این شرایط تابع قانون کشوری است که رسانه‌ی NOVA در آن ثبت شده و دادگاه‌های آن به هر اختلاف رسیدگی می‌کنند، بی‌آنکه حقی را که قانون در محل زندگی شما به‌عنوان مصرف‌کننده به شما می‌دهد بگیرد."],
      },
    ],
  },
  cookies: {
    title: "سیاست کوکی",
    description: "هر کوکی و هر ذخیره‌ی محلی که NOVA به کار می‌برد، دلیلش و چگونگی انتخاب شما.",
    lead: "NOVA دو کوکی می‌گذارد که هر دو برای وارد نگه داشتن شما هستند و چند چیز کوچک در مرورگر شما ذخیره می‌کند. نه تبلیغات، نه تحلیل بازدید، نه ردیابی و نه اسکریپت کس دیگری.",
    sections: [
      {
        id: "what",
        title: "NOVA چه چیزی روی دستگاه شما ذخیره می‌کند",
        paragraphs: ["دو دسته. موارد ضروری کاری را که خواسته‌اید راه می‌اندازند (وارد ماندن، به‌خاطر سپردن همین انتخاب، دکمه‌ی ذخیره) و بدون پرسش به کار می‌روند. موارد ترجیحی آسایش‌اند (روشن یا تاریک، جست‌وجوهای اخیر) و فقط اگر اجازه بدهید ذخیره می‌شوند."],
      },
      {
        id: "never",
        title: "آنچه به کار نمی‌بریم",
        paragraphs: ["نه کوکی تبلیغاتی. نه کوکی تحلیل یا ردیابی، نه اثرانگشت مرورگر و نه شناسه‌ی میان‌سایتی. نه اسکریپت، پیکسل یا جاسازیِ شخص ثالث: سیاست امنیتی سایت بارگذاری هر چنین چیزی را ممنوع می‌کند."],
      },
      {
        id: "choose",
        title: "انتخاب شما",
        paragraphs: ["می‌توانید ذخیره‌ی ترجیحی را بپذیرید یا فقط به موارد ضروری بسنده کنید، و هر زمان با «تنظیمات کوکی» در پایین صفحه یا همین‌جا نظرتان را عوض کنید. انتخاب «فقط ضروری» موارد ترجیحیِ ذخیره‌شده را پاک می‌کند. سایت در هر دو حالت کامل کار می‌کند؛ بدون ترجیح‌ها فقط پوسته‌ی انتخابی شما را وقتی می‌روید فراموش می‌کند."],
      },
      {
        id: "clear",
        title: "خودتان پاکشان کنید",
        paragraphs: ["مرورگر شما اجازه می‌دهد هر زمان کوکی‌ها و داده‌ی سایت NOVA را ببینید و حذف کنید. خروج از حساب هم کوکی‌های ورود را تمام می‌کند."],
      },
    ],
  },
};

export const legalDocs: Record<Locale, Record<LegalKey, LegalDoc>> = { en, fa };
