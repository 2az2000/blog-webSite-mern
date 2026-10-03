# NOVA · فرانت‌اند Next.js

فرانت‌اند سایت خبری، جایگزین `../client` (Vite). طراحی و رفتار از `../blog-refrence` پورت شده است و **UI باید هیچ تفاوتی با مرجع نداشته باشد**.

```bash
npm install
npm run dev          # http://localhost:3000  ·  دیزاین سیستم: /design-system
```

سرور Express (`../server`) باید روی `API_ORIGIN` (پیش‌فرض `http://localhost:5000`) در دسترس باشد؛ `/api/*` به آن پروکسی می‌شود.

## استایل

Tailwind v4 تنها سازوکار استایل است و shadcn/ui پریمیتیوهای تعاملی را می‌دهد. بدون CSS Modules، بدون کلاس گلوبال، بدون فایل CSS جدید؛ همه‌ی توکن‌ها در بلوک `@theme` فایل `src/app/globals.css` هستند. دلیل: [ADR 002](docs/adr-002-tailwind-only-styling.md).

## مستندات

| سند | موضوع |
|---|---|
| [docs/01-architecture.md](docs/01-architecture.md) | ساختار پوشه‌ها، جهت وابستگی، Server/Client، داده، تم، i18n |
| [docs/02-tokens.md](docs/02-tokens.md) | توکن‌ها و نگاشتشان به utilityهای Tailwind، تایپوگرافی، بریک‌پوینت‌ها، امضاها، دسترس‌پذیری |
| [docs/03-components.md](docs/03-components.md) | لایه‌بندی کامپوننت‌ها، قاعده‌ی عدم تکرار، روش نوشتن کامپوننت، جریان کار shadcn، کاتالوگ، چک‌لیست |
| [docs/04-fidelity.md](docs/04-fidelity.md) | ابزارهای مقایسه با مرجع، روش پورت هر صفحه، نتیجه‌ی اندازه‌گیری، انحراف‌های عمدی و quirkهای مرجع که عیناً حفظ شده‌اند |
| [docs/05-roadmap.md](docs/05-roadmap.md) | مرحله‌های مهاجرت به Tailwind و وضعیت هر مرحله |
| [docs/adr-001-ui-library.md](docs/adr-001-ui-library.md) | چرا shadcn/ui و نه Ant Design |
| [docs/adr-002-tailwind-only-styling.md](docs/adr-002-tailwind-only-styling.md) | چرا Tailwind تنها سازوکار استایل است |

قواعد اجرایی برای هر تغییر UI در [CLAUDE.md](CLAUDE.md) آمده است.

## قواعد در یک نگاه

- رنگ، فاصله، فونت و زمان فقط از توکن‌های `@theme` — بدون hex و بدون مقدار دلخواه.
- هر بخش تکرارشونده فقط **یک** کامپوننت دارد؛ تفاوت‌ها با prop و variant بیان می‌شوند.
- صفحه‌ها فقط داده می‌گیرند و کامپوننت می‌چینند.
- URL از `src/config/routes.ts`، متن از `src/i18n/dictionaries`، داده از `src/services`.
- پیش‌فرض Server Component؛ `"use client"` فقط در برگ‌های تعاملی.
- هر تغییر: RTL، تم تیره و عرض ۳۶۰px بدون اسکرول افقی، و بررسی بصری در برابر مرجع.
