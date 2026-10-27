# NOVA backend — فاز ۰ تا ۷ و ۹ (پایه امن + احراز هویت + محتوا + پنل + تعامل + نظرات + جستجو + خبرنامه + سخت‌سازی)

بک‌اند TypeScript/ESM برای `web/`، طبق نقشه‌ی راه `web/docs/06-backend-roadmap.md`.
این فولدر جانشین `../server` است؛ `../server` تا پایان مهاجرت دست‌نخورده می‌ماند.

## دو حالت اجرا (A/B) — یک کد

| | ورودی | اجرا |
|---|---|---|
| **B — Node دائمی** | `src/index.ts` | `npm run dev` (tsx watch) یا `npm run build && npm start` → `localhost:5000` |
| **A — Vercel serverless** | `api/index.ts` | ریپو/فولدر `backend` را به Vercel بدهید؛ `vercel.json` مسیر `/api/*` را به همان app می‌فرستد |

اتصال Mongo و rate-limit هوشمند انتخاب می‌شوند:

- DB: کشِ اتصال روی `globalThis` — برای B صرفاً یک‌بار وصل می‌شود، برای A بین invocation ها بازیافت می‌شود.
- Rate-limit: اگر `UPSTASH_REDIS_REST_URL/TOKEN` ست باشد → Redis (الگوی درست برای A)؛ وگرنه store حافظه‌ای (برای B/تست). خرابی Redis فیل-اوپن است.

وب (`web/next.config.ts`) روی `API_ORIGIN` (پیش‌فرض `http://localhost:5000`) پراکسی می‌کند؛ پس `/api/*` سایت از همین سرور خوانده می‌شود و کوکی‌ها هم‌دامنه می‌مانند.

## ساختار

```
backend/
  api/index.ts            ورودی A (serverless)
  src/
    index.ts              ورودی B (dotenv + listen)
    app.ts                مونتاژ میدل‌ورها + مسیرها (بدون listen)
    config/               env (zod) · logger (pino)
    db/connect.ts         اتصال کش‌شده Mongo
    http/                 errors · error-handler · auth (requireAuth) · cookies · validate
    models/               user · session · author · section · topic · article · article-revision · audit-log · media · bookmark · like · follow · collection · read-event · broken-link · comment (+ like, report) · placement · search-term · newsletter (subscriber, issue, delivery)
    services/             token · session · otp · email/ · rate-limit/
    modules/auth/         schemas · controller · routes · user.service
    modules/content/      schemas (قرارداد بلوک‌ها) · service · controller · routes · seed
    modules/admin/        article-workflow (قوانین خالص) · articles.service · admin.service · schemas · controller · routes
    modules/newsletter/   rules (فرکانس/موضوع/لینک‌ها) · service (اشتراک، شماره‌ها، ارسال دسته‌ای) · routes
    modules/search/       search.service (text index + prefix) · schemas · routes
    modules/comments/     comment-rules (سیاست خالص) · service · controller · routes
    modules/engagement/   بازدید/خواندن کامل · لایک · ذخیره · کالکشن · دنبال‌کردن · تاریخچه · گزارش لینک خراب
    routes/               health + mount /api/v1
    openapi.ts            سند OpenAPI + صفحه‌ی /api/v1/docs (Redoc)
  scripts/seed.ts         ساخت اولین ادمین
  scripts/seed-content.ts بارگذاری محتوا از seed/ (idempotent)
  scripts/export-web-mock.ts  عکس‌برداری یک‌باره از mock وب به seed/*.json
  seed/                   مقاله‌ها، نویسنده‌ها، بخش‌ها، موضوع‌ها (JSON)
  tests/unit/             تست‌های بدون دیتابیس (npm test)
  tests/api/              جریان کامل auth و API محتوا با supertest + Mongo درون‌حافظه (npm run test:api)
```

لایه‌بندی: `route → controller → service(user/session/otp/email) → model`. جهت وابستگی فقط
پایین به بالا؛ controllers بدنه‌ی سرویس‌ها را صدا می‌زنند نه مستقیم مونگو.

## API — `/api/v1`

`GET /health` · `GET /health/db` · `GET /openapi.json` · `GET /docs`

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/auth/register` | ساخت حساب + ارسال کد ۶ رقمی (اگر ایمیلِ تأییدنشده موجود باشد، کد تازه می‌فرستد) |
| POST | `/auth/verify-email` | مصرف کد |
| POST | `/auth/verify-email/resend` | ارسال مجدد (پاسخ همیشه generic) |
| POST | `/auth/login` | ورود؛ ست‌کردن کوکی `nova_at` (۱۵ دقیقه) و `nova_rt` (۳۰ روز، path `/api/v1/auth`) |
| POST | `/auth/refresh` | چرخشِ refresh (detect reuse → ریوک همه‌ی سشن‌ها) |
| POST | `/auth/logout` | ریوک سشن + پاک‌کردن کوکی‌ها |
| GET | `/auth/me` | کاربر جاری (نیاز به access cookie) |
| PATCH | `/auth/me/profile` | نام |
| POST | `/auth/me/change-password` | تغییر رمز؛ بقیه‌ی سشن‌ها ریوک، همین دستگاه سشن تازه می‌گیرد |
| DELETE | `/auth/me` | حذف حساب (سشن‌ها ریوک؛ ۲۰۴) |
| POST | `/auth/forgot-password` | ارسال لینک یک‌ساعته/یک‌بارمصرف؛ پاسخ همیشه generic |
| POST | `/auth/reset-password` | مصرف توکن → رمز تازه؛ همه‌ی سشن‌ها ریوک |

### تنظیمات حساب، داشبورد و جدول دسترسی

- **دستگاه‌ها:** `GET /auth/me/sessions` (نشست‌های زنده؛ `current` = همین دستگاه؛ نه توکن، نه IP)، `DELETE /auth/me/sessions/:id` (فقط نشست خودِ حساب؛ مال دیگری ⇒ `404 DEVICE_NOT_FOUND`)، `POST /auth/me/sessions/sign-out-others`. نشستِ خارج‌شده دیگر refresh نمی‌شود.
- **خبرنامه از حساب:** `GET/PUT /newsletter/mine` روی ایمیلِ حساب. کاربر واردشده صاحب صندوق ثابت شده، پس عضویت بی‌ایمیل تأیید و فوری است (`source: account`)؛ `subscribed:false` لغو می‌کند.
- **پروفایل، تغییر رمز، export، حذف حساب:** از قبل بودند (`PATCH /auth/me/profile`، `POST /auth/me/change-password`، `GET /auth/me/export`، `DELETE /auth/me`)؛ صفحه‌ی `/account` سایت همه را به هم وصل می‌کند. تغییر ایمیل عمداً نیست (به جریان تأیید جدا نیاز دارد).
- **داشبورد:** `GET /admin/stats?days=7|14|30` — بازدید روزانه و خواندن کامل (از `read_events`؛ «بازدید» = یک بازدیدکننده در یک روز)، مقایسه با بازه‌ی قبل، پرخواننده‌ترین‌های بازه و همه‌زمان‌ها، مقاله‌ها به تفکیک وضعیت. نویسنده فقط مقاله‌های خودش را می‌بیند (`scope: own`)، ویراستار صف‌ها (نظر نگه‌داشته/گزارش‌شده، لینک خراب) و مشترکین را هم، مدیر حساب‌ها را هم.
- **جدول دسترسی (RBAC یک‌جا):** `src/http/permissions.ts` — هر قابلیت (`articles.publish`, `comments.moderate`, `users.manage` …) با نقش‌هایش. همه‌ی routeهای `/admin` با `can("…")` محافظت می‌شوند، نه با اسم نقش؛ `GET /admin/permissions` (فقط مدیر) همین جدول را برمی‌گرداند و صفحه‌ی `/admin/roles` آن را چاپ می‌کند؛ تست API ثابت می‌کند جدول و guardها یکی‌اند. قابلیت تازه = یک ردیف اینجا + `can(...)` روی route.
- **گزارش‌ها:** صفحه‌ی `/admin/reports` همان `GET /admin/reports` (لینک‌های خراب) است؛ گزارش نظرها در `/admin/comments` می‌ماند.

### رسانه و رضایت

- **تصویر:** آپلود مستقیم مرورگر ← Cloudinary با پارامتر امضاشده‌ی API. فرمت‌های مجاز (`jpg,jpeg,png,webp,avif,gif`؛ SVG عمداً نه، چون می‌تواند اسکریپت داشته باشد) داخل امضا می‌رود، پس فرم جعلی نمی‌تواند فرمت اضافه کند؛ وب هم نوع و حجم (حداکثر ۱۰ مگابایت) را پیش از آپلود می‌سنجد. ثبت در کتابخانه (`POST /admin/media`) بدون توضیح تصویر رد می‌شود (`alt` پر یا `decorative: true`؛ هر دو با هم نه).
- **alt اجباری:** بلوک‌های `figure` و `break` فیلد `decorative` دارند؛ هنگام انتشار (نه پیش‌نویس) اگر alt خالی و تزئینی هم نباشد `422 ARTICLE_INCOMPLETE` با مسیر `body.N.alt` می‌آید. تصویر شاخص alt را از عنوان مقاله می‌گیرد. ویرایشگر تا وقتی alt نوشته یا «تزئینی» تیک نخورده، دکمه‌ی آپلود را غیرفعال می‌کند.
- **اندازه‌ها و WebP/AVIF:** سایت تصویرهای Cloudinary را با `SiteImage` (آدرس `…/upload/f_auto,q_auto,c_limit,w_{عرض}/…`) از خودِ Cloudinary می‌گیرد؛ `next/image` همچنان `srcset` و `sizes` را می‌نویسد و Cloudinary برای هر عرض، AVIF یا WebP یا JPEG را بسته به مرورگر می‌دهد. تصویرهای `/public` همان بهینه‌ساز Next را دارند.
- **رضایت:** هر حساب موقع ساخت `terms: { acceptedAt, version }` می‌گیرد؛ هر عضویت Dispatch `consentAt` و `consentVersion`. نسخه را **سرور** می‌زند (`src/config/legal.ts` ← `POLICY_VERSION`)، نه کلاینت؛ با تغییر متن‌های حقوقی آن را (و نظیرش را در `web/src/config/legal.ts`) عوض کنید. هر دو در export شخصی هم می‌آیند.

### سخت‌سازی (فاز ۹)

- **CSRF:** کوکی‌ها `SameSite=Lax` هستند (مرورگر آن‌ها را به POST بین‌سایتی نمی‌چسباند) و علاوه بر آن `csrfGuard` هر درخواستِ نوشتنی (`POST/PUT/PATCH/DELETE`) را که **کوکی نشست** دارد فقط وقتی می‌پذیرد که `Origin` از خودِ سایت باشد: `WEB_APP_URL` + `ALLOWED_ORIGINS` (و localhost در dev). بدون Origin، `Sec-Fetch-Site: cross-site` رد می‌شود. درخواست بدون کوکی (توکن Bearer، cron، دکمه‌ی لغو Gmail، فرم‌های عمومی) دست‌نخورده می‌گذرد، چون اعتبارنامه‌ی ضمنی ندارد. پاسخ رد: `403 CSRF_REFUSED`. **`WEB_APP_URL` باید همان origin واقعی سایت باشد** (www و بدون‌www دو origin‌اند؛ دومی را در `ALLOWED_ORIGINS` بگذارید).
- **CORS:** بسته است، چون مرورگر فقط از طریق `/api/*` همان‌دامنه‌ی سایت صدا می‌زند (rewrite در `next.config.ts`)؛ هیچ هدر `Access-Control-*` داده نمی‌شود.
- **«داده‌ام را بده»:** `GET /auth/me/export` — حساب، نشست‌ها، ذخیره‌ها، لایک‌ها، دنبال‌کردن‌ها، کالکشن‌ها، نظرها، تاریخچه، تصویرهای آپلودشده و اشتراک خبرنامه‌ی همان ایمیل، به‌صورت دانلود JSON. هیچ secret (hash رمز/توکن) داخلش نیست.
- **حذف حساب** حالا اشتراک خبرنامه‌ی همان آدرس را هم پاک می‌کند (علاوه بر نشست‌ها، لایک‌ها، ذخیره‌ها، نظرها …).
- **Sentry (اختیاری):** با `SENTRY_DSN` فقط خطاهای ۵xx گزارش می‌شوند؛ cookie، authorization و بدنه‌ی درخواست هرگز پیوست نمی‌شود. بدون DSN هیچ‌کاری نمی‌کند.
- **مشاهده‌پذیری:** `GET /health` (بدون دیتابیس) و `GET /health/db` (ping مونگو) برای مانیتور؛ لاگ ساخت‌یافته‌ی pino با redact کوکی‌ها.
- **پشتیبان‌گیری:** Atlas M0 پشتیبان خودکار ندارد؛ برای نسخه‌ی رایگان به‌صورت دوره‌ای `mongodump` بگیرید (یا کلاستر M2+ با Cloud Backup). مجموعه‌های مهم: `articles`, `article_revisions`, `users`, `comments`, `newsletter_subscribers`.
- **CI:** `.github/workflows/backend-ci.yml` (typecheck، lint، unit، build) و یک job جدا برای `test:api`؛ `web-ci.yml` سایت را روی API واقعی + Mongo می‌سازد و تست‌های مرورگر را اجرا می‌کند. `npm run seed:e2e` حساب‌های تست مرورگر را می‌سازد (در production رد می‌شود).

### خبرنامه — NOVA Dispatch (فاز ۷)

اشتراک بدون حساب کاربری است و **double opt-in**؛ هر لینک داخل ایمیل بدون ورود کار می‌کند.

| مسیر | توضیح |
|---|---|
| `POST /newsletter/subscribe` | `{ email, topics?, frequency?, source? }` → همیشه `202 { ok }` (حتی اگر آدرس از قبل مشترک باشد: لو نمی‌دهد). فقط برای آدرس تازه/در انتظار، لینک تأیید (۷ روز) فرستاده می‌شود؛ محدودیت ۶ در ساعت |
| `POST /newsletter/confirm` | `{ token }` → مشترکِ تأییدشده |
| `POST/PATCH /newsletter/manage` | خواندن / تغییر فرکانس و موضوع‌ها با لینک ایمیل |
| `POST /newsletter/unsubscribe` | لغو **یک‌کلیکی**: `?token=` + بدنه‌ی فرم (RFC 8058، دکمه‌ی خود کلاینت ایمیل) یا JSON `{ token }` |
| `POST /newsletter/resubscribe` | برگشت با همان لینک (نیازی به تأیید دوباره نیست، لینک مالکیت صندوق را ثابت می‌کند) |
| `GET /newsletter/issues/latest` | آخرین شماره‌ی ارسال‌شده با مقاله‌هایش (برای «A recent issue») |
| `/admin/newsletter/issues` (+ `/:id`, `/test`, `/schedule`, `/unschedule`, `/send`) | ساخت و ارسال شماره (ویراستار/ادمین) |
| `GET /admin/newsletter/subscribers` · `DELETE …/:id` | فهرست با شمارش وضعیت‌ها · پاک‌کردن کامل (ادمین، برای «حق فراموشی») |
| `GET /internal/run-issues` | cron: شماره‌های زمان‌بندی‌شده را شروع می‌کند و تا ~۸ ثانیه دسته‌به‌دسته می‌فرستد |

- **فرکانس:** `both` = شماره‌های سه‌شنبه و جمعه · `weekly` = فقط جمعه · `monthly` = فقط خلاصه‌ی ماهانه‌ی long read. هر شماره `kind` دارد (`tuesday|friday|monthly`) و فقط به فرکانس‌های مربوطش می‌رسد.
- **موضوع‌ها:** مشترک بدون موضوع همه‌چیز می‌گیرد؛ وگرنه شماره باید دست‌کم یکی از بخش‌هایش (یا `longreads`) را داشته باشد، وگرنه برایش کنار گذاشته می‌شود (`skipped`).
- **شماره:** موضوع (≤۱۴۰)، یادداشت سردبیر، تا ۸ مقاله‌ی **منتشرشده**. پیش از ارسال با `/test` برای خودِ ویراستار می‌رود. بعد از شروع ارسال دیگر قابل ویرایش/حذف نیست.
- **ارسال دسته‌ای و قابل‌ادامه:** ۲۵ تا در هر دسته (۵ همزمان) به ترتیب `_id` بعد از آخرین نفرِ پردازش‌شده. جفتِ یکتای `(issue, subscriber)` تضمین می‌کند هیچ‌کس دو بار نامه نگیرد، حتی با دو اجرای همزمان یا تلاش دوباره؛ شکست هر نفر ثبت می‌شود و بقیه ادامه می‌دهند. با `POST …/send` دسته‌ی اول می‌رود و تا `status: sent` می‌شود دوباره صدا زد؛ cron هم همین را می‌کند.
- **هر نامه:** لینک شخصیِ مدیریت/لغو (توکن HMAC بدون ذخیره‌سازی، منقضی نمی‌شود، برای دیگری قابل جعل نیست) و هدرهای `List-Unsubscribe` + `List-Unsubscribe-Post`. متن ویراستار در HTML escape می‌شود.
- **Vercel Hobby:** cron فقط روزی یک بار؛ `vercel.json` دو cron دارد (انتشار زمان‌بندی‌شده ۰۴:۰۰، ارسال خبرنامه ۰۷:۰۰ UTC). شماره‌ی زمان‌بندی‌شده در اولین اجرای cron پس از زمانش می‌رود؛ برای ارسال فوری «Send now».
- ایمیل واقعی: `RESEND_API_KEY` لازم است؛ بدون آن نامه‌ها در لاگ (`[mail:console]`) چاپ می‌شوند.

### جستجو (فاز ۶)

| مسیر | توضیح |
|---|---|
| `GET /search?q=` | `sort=relevance\|newest\|popular`, `page`, `limit` (≤۵۰) → `{ data: { articles, authors, topics }, page: { totals, page, limit, term } }` |
| `GET /search/popular` | عبارت‌هایی که خواننده‌ها جستجو می‌کنند و چیزی پیدا می‌شود (برای «Try one of these») |
| `GET /admin/searches?kind=top\|empty` | ویراستار: پرجستجوها، و عبارت‌هایی که **هیچ مقاله‌ای** پیدا نکرده‌اند (حفره‌ی پوشش خبری) |

- **مقاله‌ها:** ایندکس متنی مونگو با وزن عنوان ۱۰ > برچسب ۶ > چکیده ۳ و stemming انگلیسی (`batteries` ← `battery`)؛ نام نویسنده هم مقاله‌هایش را پیدا می‌کند.
- **پیشوند:** ایندکس متنی فقط کلمه‌ی کامل می‌یابد؛ اگر چیزی پیدا نشد هر کلمه به‌عنوان «ابتدای یک کلمه» دوباره امتحان می‌شود (`archi` ← `archive`)، همان‌طور که مردم در کادر جستجو تایپ می‌کنند.
- **نویسنده‌ها و موضوع‌ها:** کم‌اند و مستقیم تطبیق داده می‌شوند (همه‌ی کلمه‌ها در نام/نقش/توضیح).
- **ورودی بد:** `-کلمه` (حذف در `$text`)، گیومه‌ی عبارت، و regex بی‌اثر می‌شوند؛ حداکثر ۸ کلمه و ۱۰۰ نویسه؛ `q` بلندتر از ۲۰۰ نویسه `400`.
- **آمار:** فقط خودِ عبارت و شمارنده (بدون هیچ شناسه‌ی کاربر یا IP). «Show more»، تغییر مرتب‌سازی، خزنده‌ها و درخواست بدون مرورگر شمرده نمی‌شوند.
- مرحله‌ی بعد، در صورت نیاز: Atlas Search (جستجوی فازی و پیشنهاد) پشت همین رابط.

### چینش صفحه‌ی اول (سردبیر تعیین می‌کند)

| مسیر | توضیح |
|---|---|
| `GET /placements/home` | عمومی و قابل‌کش: `lead(1) secondary(2) brief(4) picks(4) opinion(4) longread(1)` — هر کدام آرایه‌ای از summary مقاله |
| `GET/PUT /admin/placements/home` | ویراستار/ادمین: `pinned` (slugها) + `live` (چه چیزی الان نشان داده می‌شود و کدام خودکار پر شده) / جایگزینی کل پین‌ها |

- فقط **slug** ذخیره می‌شود؛ هنگام خواندن حل می‌شود. مقاله‌ای که از انتشار خارج شود خودش از جایگاه می‌افتد و جا خالی نمی‌ماند.
- **پر شدن خودکار:** هر جایگاهِ خالی (یا کم) با تازه‌ترین مقاله‌ی مناسب پر می‌شود: news = `article|video`، ستون یادداشت = `opinion|interview`، گزارش بلند = `longread`. پر شدنِ خودکار هیچ مقاله‌ای را که از قبل روی صفحه هست تکرار نمی‌کند (خودِ سردبیر می‌تواند عمداً یک مقاله را در دو جایگاه پین کند)، پس صفحه‌ی اول هرگز کم نمی‌آورد و مقاله‌ی تازه بدون دست‌زدن‌ِ کسی ظاهر می‌شود.
- ذخیره: همه‌ی مقاله‌ها باید `published` باشند (`422 UNKNOWN_ARTICLE`)، هر جایگاه سقف دارد و تکرارِ یک مقاله در همان جایگاه `400` است. بعد از ذخیره وب‌هوک `placement:home` زده می‌شود.
- `npm run seed:content` فقط وقتی چینشی نیست، چینش صفحه‌ی اولِ طراحی مرجع را می‌گذارد؛ چینش سردبیر را هرگز بازنویسی نمی‌کند.

### نظرات (فاز ۵)

«نظرات را آدم‌ها مدیریت می‌کنند، نه فیلتر»: هیچ قانونی نظر را حذف نمی‌کند؛ بدترین کارش **نگه‌داشتن** (`held`) برای ناظر است. خصوصی‌اند (`no-store`).

| مسیر | توضیح |
|---|---|
| `GET /articles/:slug/comments` | رشته: نظرهای سطح‌اول (`sort=new\|old\|top`, `page`, `limit`) با پاسخ‌هایشان (قدیمی‌ترین اول). `page.count` = همه‌ی نظرهای منتشرشده (عدد تیتر) |
| `POST /articles/:slug/comments` | `{ body, parent? }` — منتشر یا نگه‌داشته‌شده. پاسخ به یک پاسخ، به همان رشته می‌پیوندد (فقط یک سطح تو) |
| `PATCH /comments/:id` | ویرایش — **یک بار** و تا ۲۴ ساعت. ویرایشِ نظرِ حذف‌شده توسط ناظر = ارسال دوباره (می‌رود صف ناظر) |
| `DELETE /comments/:id` | حذف نظر خود؛ اگر پاسخ زیرش باشد جایش خالی می‌ماند |
| `PUT/DELETE /comments/:id/like` | لایک (idempotent) |
| `POST /comments/:id/report` | `{ reason: spam\|abuse\|off-topic\|other, note? }`؛ هر خواننده یک بار |
| `GET /admin/comments?queue=` | صف ناظر (ویراستار/ادمین): `pending` (پیش‌فرض: نگه‌داشته + گزارش‌شده)، `held`, `reported`, `removed`, `published` |
| `POST /admin/comments/:id/approve` · `…/remove` | انتشار (گزارش‌ها پاک می‌شود) · حذف با **دلیل** (جایش می‌ماند و دلیل نشان داده می‌شود) |

- **چه چیزی نگه داشته می‌شود:** کمتر از ۱۰ نویسه (همان متن «تا ۱۰ نویسه برای بازبینی نگه داشته می‌شود» در UI)، بیش از ۲ لینک، یا اولین نظری که لینک دارد (قالب کلاسیک اسپم). نظر نگه‌داشته‌شده فقط برای نویسنده‌اش دیده می‌شود (`pending: true`).
- **گزارش:** سه خواننده‌ی متفاوت → نظر به صف برمی‌گردد (`heldFor: reports`).
- **ضداسپم:** ۵ نظر در ۱۰ دقیقه برای هر خواننده، نظر کاملاً تکراری (۲۴ ساعت) `409`، حداکثر ۲۰۰۰ نویسه. متن فقط plain-text است.
- **نشان «Author»:** نظرِ حسابی که بایلاینِ مقاله به آن وصل است.
- `Article.commentCount` فقط نظرهای **منتشرشده** را می‌شمارد و با هر ورود/خروج از این وضعیت جابه‌جا می‌شود (بازشماری نمی‌کند تا عددهای seed نپرد).
- حذف حساب: نظرها حذف (یا اگر پاسخ دارند خالی) و لایک‌هایش از شمارنده‌ها برداشته می‌شود.
- هر تصمیم ناظر در audit ثبت می‌شود (`comment.approve`, `comment.remove`).

### تعامل خواننده (فاز ۴)

همه خصوصی‌اند (`Cache-Control: no-store`). شمارش بازدید برای همه کار می‌کند؛ بقیه نیاز به ورود دارند.

| مسیر | توضیح |
|---|---|
| `POST /articles/:slug/view` | بازدید؛ هر بازدیدکننده روزی **یک بار** (refresh شمرده نمی‌شود). خزنده‌ها و درخواست بدون browser نادیده گرفته می‌شوند |
| `POST /articles/:slug/read` | «خواندن کامل» (خواننده به انتها رسید)؛ روزی یک بار؛ **trending** از روی خواندن‌های کاملِ ۷ روز اخیر رتبه می‌گیرد و جای خالی را با کل بازدید پر می‌کند |
| `GET /articles/:slug/engagement` | `views, likes, reads, comments` + وضعیتِ خودِ خواننده (`viewer: {liked, bookmarked}` یا `null`) |
| `PUT/DELETE /articles/:slug/like` | لایک (idempotent؛ عدد فقط وقتی واقعاً چیزی عوض شود تکان می‌خورد) |
| `GET /me/bookmarks` · `PUT/DELETE /me/bookmarks/:slug` | لیست مطالعه (تازه‌ترین ذخیره اول، با summary کامل مقاله) |
| `POST /me/bookmarks/sync` | ادغام لیستِ localStorage مرورگر بعد از ورود (`{ slugs }`؛ اولین slug تازه‌ترین می‌شود، ناموجود/تکراری رد می‌شود) |
| `/me/collections` (+ `/:id`, `/:id/articles/:slug`) | کالکشن‌های نام‌دار (حداکثر ۲۰، هرکدام ۲۰۰ مقاله) |
| `GET /me/follows` · `PUT/DELETE /me/follows/:kind/:slug` | دنبال‌کردن `author` یا `topic`؛ تعداد دنبال‌کننده در `GET /authors/:slug` و `/topics/:slug` (`followers`) |
| `GET/DELETE /me/history` | «اخیراً دیده‌شده» (۹۰ روز) و فراموش‌کردن آن |
| `POST /reports/broken-link` | دکمه‌ی «گزارش لینک خراب» صفحه‌ی ۴۰۴؛ ناشناس، با rate-limit؛ ویراستار در `GET /admin/reports` می‌بیند و `POST /admin/reports/:id/resolve` می‌بندد |

- **حریم خصوصی:** آدرس IP ذخیره نمی‌شود. بازدیدکننده‌ی ناشناس یک hash نمک‌دار از IP+مرورگر است که **هر روز عوض می‌شود** (می‌شود یک بازدید را شمرد، نمی‌شود کسی را روزبه‌روز دنبال کرد). خواننده‌ی واردشده `u:<id>` است و فقط برای تاریخچه‌ی خودش نگه داشته می‌شود؛ ردیف‌ها بعد از ۹۰ روز خودکار پاک می‌شوند.
- شمارنده‌ها (`views`, `likeCount`, `readCount`) `updatedAt` مقاله را عوض نمی‌کنند؛ «آخرین ویرایش» در پنل فقط ویرایش واقعی است.
- حذف حساب لایک‌ها را از شمارنده‌ها برمی‌دارد و ذخیره‌ها/دنبال‌کردن‌ها/کالکشن‌ها را پاک می‌کند.
- محدودیت: خواندن کامل را یک کلاینتِ بدخواه می‌تواند با تغییر UA/IP باد کند (سقف: ۱۲۰ درخواست در دقیقه برای هر IP). سنجش واقعیِ «تا انتها خواندن» (مثلاً زمان صرف‌شده) فرانت را می‌خواهد.

### پنل مدیریت — `/admin/*` (فاز ۳)

همه‌ی مسیرها نیاز به ورود با نقش staff دارند و هرگز کش نمی‌شوند.

| نقش | می‌تواند |
|---|---|
| `writer` | پیش‌نویس بسازد؛ فقط **مقاله‌ی خودش** را ببیند و تا وقتی `draft` است ویرایش کند؛ تصویر ثبت کند. نمی‌تواند منتشر/زمان‌بندی/بایگانی کند. |
| `editor` | همه‌ی مقاله‌ها، تغییر وضعیت، بخش‌ها/نویسنده‌ها/موضوع‌ها |
| `admin` | + کاربران (نقش/تعلیق)، حذف مقاله، audit |

| مسیر | توضیح |
|---|---|
| `GET/POST /admin/articles` | لیست (`status`, `section`, `author`, `q`, `page`, `limit`) · ساخت پیش‌نویس (فقط `kind`, `section`, `title` اجباری؛ slug از عنوان ساخته و در تکرار شماره‌گذاری می‌شود) |
| `GET/PATCH/DELETE /admin/articles/:id` | خواندن کامل · ویرایش (نسخه‌ی تازه + revision؛ با `baseVersion` تداخل دو ویراستار شناسایی می‌شود) · حذف (admin) |
| `POST /admin/articles/:id/status` | `{ status, scheduledFor? }` — گردش کار پایین |
| `GET /admin/articles/:id/revisions[/:version]` · `POST …/restore` | تاریخچه و بازگردانی (به‌صورت نسخه‌ی جدید؛ slug برنمی‌گردد) |
| `POST/PATCH/DELETE /admin/{authors,sections,topics}` | مدیریت فهرست‌ها؛ حذفِ در-حال-استفاده `409 IN_USE`؛ `latest` حذف‌شدنی نیست |
| `POST /admin/media/sign` · `POST/GET /admin/media` | امضای آپلود مستقیم به Cloudinary · ثبت تصویر با ابعاد/alt/credit |
| `GET /admin/users` · `PATCH /admin/users/:id` | حساب‌ها؛ تغییر نقش/تعلیق (تعلیق همه‌ی سشن‌ها را می‌بندد؛ تغییر خودِ شما ممنوع) |
| `GET /admin/audit` | چه کسی چه کرد (فقط خواندنی) |
| `GET /internal/publish-due` | برای Vercel Cron (`Bearer $CRON_SECRET`)؛ بدون secret بسته است |

**گردش کار:** `draft → scheduled | published` · `scheduled → draft | published | scheduled(زمان جدید)` · `published → archived | draft` · `archived → draft | published`.

- هنگام `published`/`scheduled` کل مقاله دوباره با قرارداد عمومی اعتبارسنجی می‌شود؛ ناقص بودن → `422 ARTICLE_INCOMPLETE` با فهرست فیلدهای کم. مقاله‌ی زنده هم به حالت ناقص ویرایش نمی‌شود.
- slug بعد از اولین انتشار قفل است (`SLUG_LOCKED`) تا لینک‌ها نشکنند.
- زمان‌بندی: حداقل یک دقیقه جلوتر. انتشار با cron روزانه (محدودیت Hobby) **و** با اولین خواندنِ عمومی بعد از موعد (حداکثر هر ۳۰ ثانیه یک sweep) انجام می‌شود، پس تأخیری نیست.
- هر تغییر یک خط audit دارد؛ با انتشار/تغییرِ مقاله‌ی زنده، وب‌هوک `POST {WEB_APP_URL}/api/revalidate` با هدر `x-revalidate-secret` و `{ tags }` زده می‌شود (`articles`, `article:<slug>`, `section:<slug>`, `author:<slug>`). بدون `REVALIDATE_SECRET` غیرفعال است؛ شکست آن هرگز انتشار را خراب نمی‌کند.
- بدنه‌ی این مسیرها تا ۵۱۲KB (بقیه ۳۲KB).

### خواندن محتوا (عمومی، فقط GET، قابل‌کش روی CDN)

| مسیر | توضیح |
|---|---|
| `/sections` · `/sections/:slug` | بخش‌ها به ترتیب منو (`latest` اول) |
| `/topics` · `/topics/:slug` | موضوع‌ها + تعداد مقاله‌ی منتشرشده |
| `/authors` · `/authors/:slug` | نویسنده‌ها + تعداد مقاله |
| `/articles` | `section` (`latest` = همه) · `author` · `topic` · `kind=a,b` · `exclude=s1,s2` · `sort=latest\|popular\|discussed` · `limit` (۱–۵۰) · `cursor` → `{ data, page: { nextCursor } }` |
| `/articles/:slug` | صفحه‌ی کامل: `article`, `detail`, `body` (بلوک‌ها؛ `recirc` با مقاله‌های حل‌شده)، `tags`, `related`, `moreByAuthor`, و برای longread `chapters` |
| `/trending` · `/most-discussed` | `limit` (۱–۲۰، پیش‌فرض ۵) |

- صفحه‌بندی **cursor (keyset)** روی `(فیلد مرتب‌سازی, _id)`؛ بدون skip، پایدار هنگام انتشار مقاله‌ی تازه.
- فقط `status: published` دیده می‌شود (پیش‌نویس و آرشیو هرگز).
- پاسخ موفق: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`؛ خطاها `no-store`.
- شکل `ArticleSummary` همان `ArticleView` وب است (بدون `href`) تا `services/content.ts` فقط منبع را عوض کند.

خطاها همیشه `{ error: { code, message, details? } }` است: `EMAIL_TAKEN`, `EMAIL_NOT_VERIFIED`,
`VERIFY_FAILED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH`, `REFRESH_REUSE`, `RESET_TOKEN_INVALID`,
`WRONG_CURRENT_PASSWORD`, `SAME_PASSWORD`, `VALIDATION_ERROR`, `ARTICLE_INCOMPLETE`, `INVALID_TRANSITION`, `VERSION_CONFLICT`, `SLUG_TAKEN`, `SLUG_LOCKED`, `ARTICLE_LOCKED`, `IN_USE`, `SELF_CHANGE`, `MEDIA_NOT_CONFIGURED`, `LIST_FULL`, `COLLECTION_NOT_FOUND`, `INVALID_FOLLOW_KIND`, `INVALID_PATH`, `INVALID_SLUG`, `REPORT_NOT_FOUND`, `UNKNOWN_ARTICLE`, `CONFIRM_TOKEN_INVALID`, `CONFIRM_TOKEN_EXPIRED`, `SUBSCRIPTION_NOT_FOUND`, `ISSUE_NOT_FOUND`, `ISSUE_LOCKED`, `ISSUE_INCOMPLETE`, `COMMENT_NOT_FOUND`, `EMPTY_COMMENT`, `COMMENT_TOO_LONG`, `DUPLICATE_COMMENT`, `PARENT_UNAVAILABLE`, `EDIT_USED`, `EDIT_EXPIRED`, `COMMENT_DELETED`, `ALREADY_REMOVED`, `OWN_COMMENT`, `INVALID_CURSOR`, `ARTICLE_NOT_FOUND`, `SECTION_NOT_FOUND`, `TOPIC_NOT_FOUND`, `AUTHOR_NOT_FOUND`, `RATE_LIMITED`, `NOT_FOUND`, `INVALID_JSON`.

## امنیت — چه چیزی نسبت به `../server` ساخته شد

- **نشت ادمین بسته شد:** ورودی‌ها با zod استریپ می‌شوند؛ `role/status/emailVerified` هرگز از `req.body` نمی‌آیند (تست رگرسیون در `tests/api`).
- access/refresh در کوکی httpOnly/sameSite=lax (+secure در prod)، refresh فقط هش ذخیره می‌شود؛ چرخش با کشف reuse.
- bcrypt (cost 12)؛ کد تأیید و توکن ریست هش‌شده، مسموع‌نشدنِ ایمیل (generic responses)، صحتِ برابرِ ثابت (timing-safe).
- helmet، محدود body، پیام‌های خطای استاندارد بدون نشت استک، pino با redact کوکی‌ها.
- rate-limit دو-لایه (کلی + سخت‌گیرانه روی login/register/forgot/verify) با store حافظه‌ای یا Upstash.

## Scripts

```bash
npm run dev        # اجرای محلی روی 5000 (watch)
npm run build && npm start
npm run typecheck  # tsc --noEmit
npm run lint
npm test           # تست‌های unit
npm run test:api   # auth + محتوا با Mongo درون‌حافظه (بار اول دانلود باینری)
npm run seed       # ساخت اولین ادمین از INITIAL_ADMIN_*
npm run seed:content  # محتوا از backend/seed (idempotent؛ با slug upsert می‌کند)
```

پیش‌نیاز محلی: `MONGO_URL` برای dev واقعی؛ برای `test:api` نیازی نیست (memory server).

## متغیرهای محیطی

`backend/.env.example` مرجع است؛ همه در `src/config/env.ts` با zod اعتبارسنجی می‌شوند.
در production: دو secret با طول ۳۲+ الزامی است و مقدار پیش‌فرضِ dev پذیرفته نمی‌شود.

## راه‌اندازی پنل برای اولین بار

```bash
INITIAL_ADMIN_EMAIL=you@example.com INITIAL_ADMIN_PASSWORD='…' npm run seed   # اولین admin
npm run seed:content                                                           # محتوای اولیه
```

سپس با ورود admin از `PATCH /admin/users/:id` نقش writer/editor بدهید و با `POST /admin/authors` (`userId`) بایلاین نویسنده را به حسابش وصل کنید.
برای آپلود تصویر `CLOUDINARY_*`، برای به‌روزشدن فوری سایت `REVALIDATE_SECRET` (همان مقدار در web) و برای cron `CRON_SECRET` را در Vercel بگذارید.

## وصل‌شدن `web/` (فاز بعدی فرانت)

- `auth/auth-screens.tsx` + `useMockSubmit` → به همین endpoint ها (کوکی‌ها خودکار، چون rewrite همان‌مُبدأ است).
- پس از ورود: `/auth/me` برای نمایش نام/وضعیت در سربر، و `proxy`/`middleware` برای محافظت `/bookmarks`.
- فاز ۲ (سمت API انجام شده): جایگزینی `services/content.ts` با fetch به `/api/v1` — امضای توابع ثابت می‌ماند؛ هر تابع یک endpoint بالا است.
  `/home` (تجمیع صفحه‌ی اصلی) عمداً نیست: صفحه‌ی اصلی با چند فراخوانی `/articles`، `/trending` و `/most-discussed` ساخته می‌شود.
- فاز ۵ (سمت API انجام شده): `CommentsSection` در `patterns/article-client.tsx` به `GET/POST /articles/:slug/comments` و `like/report/reply` وصل شود؛ `Comment` همین شکل (`author|null`, `pending`, `removed`, `replies`) را می‌خواهد؛ نمایش دلیل حذف: «Removed by a moderator for {reason}. The author may edit and repost once.»؛ زمان نسبی («2 hours ago») سمت وب از `createdAt` ساخته شود؛ پیشخوان صف ناظر (`/admin/comments`) هنوز در وب نیست.
- فاز ۴ (سمت API انجام شده): `stores/bookmarks-store.ts` را cache خوش‌بینانه نگه دارید و با `PUT/DELETE /me/bookmarks/:slug` همگام کنید؛ بعد از ورود یک بار `POST /me/bookmarks/sync` با `slugs` ذخیره‌ی محلی (**نه** نمونه‌ی SEED فروشگاه!)؛ `BookmarkButton`/`ShareBar` ← `like`؛ دکمه‌های دنبال‌کردن ← `/me/follows`؛ `ReportLinkButton` ← `POST /reports/broken-link`؛ صفحه‌ی مقاله: `POST …/view` هنگام نمایش و `POST …/read` وقتی خواننده به انتها رسید.
- فاز ۳ (سمت API انجام شده): صفحه‌های `/admin` در وب (ویرایشگر بلوکی با پیش‌نمایش `ArticleBody`) و route `app/api/revalidate` که `revalidateTag` را صدا بزند هنوز باید در `web/` نوشته شوند.
- `seed/*.json` عکس یک‌باره از `web/src/data/mock/*` است (`scripts/export-web-mock.ts`). بعد از وصل‌شدن سایت به API،
  همین JSON منبع واحد می‌شود و mock حذف می‌گردد.
