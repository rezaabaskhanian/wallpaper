# تاریخچه‌ی تغییرات — صفحه‌ی هولوگرافیک (Noor Launcher)

این فایل خلاصه‌ی کارهایی است که روی صفحه‌ی خانه‌ی هولوگرافیک انجام شده.

---

## نسخه‌ی دوم — چند حلقه + پس‌زمینه‌ی عکس + ساعت + تنظیمات

### ۱. حذف دایره‌ی وسط و پس‌زمینه‌ی تصویری
- قهرمان مرکزی (`HeroCenter`) از صفحه برداشته شد.
- لایه‌ی جدید [WallpaperBackground.tsx](../src/holographic/WallpaperBackground.tsx) یک **عکس تمام‌صفحه** نمایش می‌دهد (با پارالاکس ملایم و یک اسکریم تیره برای خوانایی).
- مسیر عکس در [config.ts](../src/holographic/config.ts) → `WALLPAPER.background` تنظیم می‌شود. اگر خالی باشد، پس‌زمینه‌ی توپوگرافی نمایش داده می‌شود.
- عکس را در [src/holographic/assets/](../src/holographic/assets/) بگذار.

### ۲. چند حلقه (چند شعاع) به‌جای یک حلقه
- قبلاً همه‌ی دایره‌ها روی **یک شعاع** می‌چرخیدند؛ حالا روی **چند حلقه‌ی هم‌مرکز** با شعاع/تعداد/اندازه/سرعت متفاوت.
- تعریف حلقه‌ها در [config.ts](../src/holographic/config.ts) → آرایه‌ی `RINGS` (پیش‌فرض ۴ حلقه، جمعاً ۳۸ دایره).
- [OrbitLayer.tsx](../src/holographic/OrbitLayer.tsx) بازنویسی شد تا چند حلقه را رندر کند؛ هر حلقه جهت و سرعت خودش را دارد.
- پول آواتارها در [data.ts](../src/holographic/data.ts) به ۴۰ تای بدون‌تکرار افزایش یافت.

### ۳. چرخش فریم‌محور با کنترل زنده‌ی سرعت
- به‌جای `withTiming` ثابت، حالا زاویه‌ی چرخش با `useFrameCallback` هر فریم انباشته می‌شود.
- سرعت را می‌شود **زنده** (بدون پرش) از تنظیمات تغییر داد؛ چرخش خودکار هم روشن/خاموش می‌شود.

### ۴. ویجت ساعت + شمارش معکوس
- [ClockWidget.tsx](../src/holographic/ClockWidget.tsx): ساعت زنده (هر ثانیه) + شمارش معکوس **عمومی و قابل‌تنظیم** تا یک تاریخ مقصد.
- ارقام فارسی، نمایش روز/ساعت/دقیقه/ثانیه و مجموع ساعت باقی‌مانده.
- تاریخ مقصد و عنوان کاملاً توسط کاربر در تنظیمات تعیین می‌شود (پیش‌فرض خنثی).

### ۵. پنل تنظیمات والپیپر
- [SettingsPanel.tsx](../src/holographic/SettingsPanel.tsx): مودال پایین‌کشویی با دکمه‌ی چرخ‌دنده ⚙ در گوشه.
- کنترل‌ها: چرخش خودکار، سرعت، تعداد حلقه‌ها، خطوط توپوگرافی، نمایش ساعت، عنوان و تاریخ شمارش معکوس.
- وضعیت در [SettingsContext.tsx](../src/holographic/SettingsContext.tsx) نگه‌داری می‌شود (فعلاً در حافظه؛ بدون وابستگی جدید).

> نکته‌ی بیلد: نسخه‌ی دیباگ همه‌معماری‌ها ~۲۵۶MB است و روی شبیه‌ساز کم‌فضا خطای
> `INSTALL_FAILED_INSUFFICIENT_STORAGE` می‌دهد. با `npx react-native run-android --active-arch-only` بیلد سبک و بدون خطا نصب می‌شود.

---

## نسخه‌ی فعلی — مدار DNA عمودی + چرخش دستی

### ۱. مدار عمودی (بالا → پایین) مثل DNA Launcher
- قبلاً دایره‌ها روی یک **بیضی افقی** می‌چرخیدند (چپ↔راست).
- حالا روی یک **حلقه‌ی عمودی** می‌چرخند: از **بالا به پایین** حرکت می‌کنند و مثل یک ستون DNA پیچ می‌خورند.
- فایل: [src/holographic/OrbitLayer.tsx](../src/holographic/OrbitLayer.tsx)
  - محور Y حرکت کامل دارد، محور X فشرده شده (`radius * 0.40`) تا حس سه‌بعدی/کج بدهد.
  - `y = centerY - radius * cos(angle)` و `x = centerX + radius * 0.40 * sin(angle)`.

### ۲. چرخش کندتر
- سرعت چرخش خودکار از **۳۴ ثانیه** برای هر دور به **۷۰ ثانیه** رسید (کندتر و آرام‌تر).
- فایل: [src/holographic/HolographicHome.tsx](../src/holographic/HolographicHome.tsx) — مقدار `orbit` در `useEffect`.

### ۳. دایره‌ها کوچک‌تر شدند (به‌جز دایره‌ی وسط)
- اندازه‌ی آیکون‌های مداری از `0.16` به `0.115` از کوچک‌ترین بُعد صفحه کاهش یافت.
- مقیاس عمق هم از `0.72 + depth*0.42` به `0.6 + depth*0.5` تغییر کرد تا تفاوت جلو/عقب واضح‌تر باشد.
- **دایره‌ی وسط (قهرمان)** دست‌نخورده و بزرگ ماند (`heroSize = 0.34`).

### ۴. چرخاندن دستی دایره‌ها با انگشت
- با **کشیدن عمودی انگشت (بالا/پایین)** می‌شود خود حلقه را چرخاند.
- بعد از رها کردن، با **اینرسی (momentum)** ادامه می‌دهد و آرام می‌ایستد (`withDecay`).
- یک شِیرد-ولیو جدید به نام `manualRotation` اضافه شد که روی چرخش خودکار `orbit` جمع می‌شود.
- کشیدن افقی همچنان **پارالاکس** ملایم کل صحنه را می‌دهد.
- فایل: [src/holographic/HolographicHome.tsx](../src/holographic/HolographicHome.tsx) — جسچر `pan`.

---

## فایل‌های تغییر کرده
| فایل | تغییر |
|------|-------|
| `src/holographic/HolographicHome.tsx` | چرخش کندتر، `manualRotation`، جسچر چرخش دستی + اینرسی، آیکون کوچک‌تر |
| `src/holographic/OrbitLayer.tsx` | مدار عمودی DNA، دریافت `manualRotation`، مقیاس عمق جدید |

> توضیح کامل معماری و نحوه‌ی شخصی‌سازی در فایل [OVERVIEW.md](./OVERVIEW.md) آمده.

---

## نسخه‌ی جدید — انتخاب فونت + جابجایی ویجت‌ها با درگ

### ۱. چند فونت فارسی و عربی + انتخاب زنده
- ۷ فونت جدید با لایسنس آزاد (OFL) اضافه شد؛ همه در [assets/fonts/](../assets/fonts/) و لینک‌شده به Android و iOS.
  - **فارسی:** ساحل (Sahel)، صمیم (Samim)، شبنم (Shabnam)، گندم (Gandom)، لاله‌زار (Lalezar) — به‌علاوه‌ی وزیرمتن و ایران‌سنس که از قبل بودند.
  - **عربی:** امیری (Amiri)، عارف رقعه (ArefRuqaa).
- رجیستری فونت‌ها در فایل جدید [fonts.ts](../src/holographic/fonts.ts): برای هر فونت `id`، برچسب فارسی، نام خانواده‌ی هر وزن، و متن پیش‌نمایش تعریف شده. تابع `familyForWeight` وزن مناسب (نازک/معمولی/متوسط/ضخیم) را با fallback انتخاب می‌کند.
- [setupFonts.ts](../src/holographic/setupFonts.ts) پویا شد: فونت فعال از یک متغیر ماژول خوانده می‌شود و تابع `setAppFont(id)` آن را عوض می‌کند؛ پچ سراسری `<Text>` فونت انتخابی را روی هر متنِ بدون `fontFamily` اعمال می‌کند.
- [SettingsContext.tsx](../src/holographic/SettingsContext.tsx): فیلد `fontId` اضافه شد و در بدنه‌ی Provider با `setAppFont` همگام می‌شود تا انتخاب فونت بلافاصله روی همه‌ی متن‌ها اثر کند.
- فونت‌های هاردکد از [ClockWidget.tsx](../src/holographic/ClockWidget.tsx) و [QuoteWidget.tsx](../src/holographic/QuoteWidget.tsx) حذف شد و [AppText.tsx](../src/holographic/AppText.tsx) نازک شد (دیگر فونت ثابت تحمیل نمی‌کند) تا از فونت انتخابی پیروی کنند.
- در [SettingsPanel.tsx](../src/holographic/SettingsPanel.tsx) بخش **«فونت نوشته‌ها»** با **پیش‌نمایش زنده** (نام هر فونت با خط خودش) اضافه شد.

### ۲. جابجایی ساعت / دما / متن پایین با درگ
- کامپوننت جدید [DraggableWidget.tsx](../src/holographic/DraggableWidget.tsx): هر ویجت را در حالت ویرایش قابل‌کشیدن می‌کند و موقعیت را به‌صورت افست `(x, y)` نگه می‌دارد (بیرون از حالت ویرایش کاملاً بی‌اثر است، مثل قبل).
- سه بلوک مستقل قابل‌جابجایی شدند:
  - **ساعت/تاریخ** → [ClockWidget.tsx](../src/holographic/ClockWidget.tsx) با `clockOffset`.
  - **دما** → [TopLeftBar.tsx](../src/holographic/TopLeftBar.tsx) با `weatherOffset` (باتری و چرخ‌دنده سرِ جای‌شان می‌مانند).
  - **متن پایین** → [QuoteWidget.tsx](../src/holographic/QuoteWidget.tsx) با `quoteOffset`.
- در [SettingsContext.tsx](../src/holographic/SettingsContext.tsx): فیلدهای `editLayout` و آفست‌های `clockOffset` / `weatherOffset` / `quoteOffset` اضافه شد.
- در [SettingsPanel.tsx](../src/holographic/SettingsPanel.tsx) بخش **«چیدمان صفحه»** اضافه شد: سوئیچ **«جابجایی ساعت و متن»** (با روشن‌شدن، پنجره بسته می‌شود) و دکمه‌ی **«↺ بازنشانی موقعیت‌ها»**.
- در [HolographicHome.tsx](../src/holographic/HolographicHome.tsx): هنگام حالت ویرایش، جسچر چرخش کره **غیرفعال** می‌شود تا با درگ تداخل نکند؛ یک نوار پایین صفحه با دکمه‌ی **«تمام»** برای خروج نمایش داده می‌شود.

### فایل‌های تغییر/اضافه‌شده
| فایل | تغییر |
|------|-------|
| `src/holographic/fonts.ts` | **جدید** — رجیستری فونت‌ها + انتخاب وزن |
| `src/holographic/DraggableWidget.tsx` | **جدید** — ویجت قابل‌کشیدن (افست + کادر ویرایش) |
| `src/holographic/setupFonts.ts` | فونت پویا با `setAppFont` |
| `src/holographic/AppText.tsx` | حذف فونت ثابت؛ پیروی از پچ سراسری |
| `src/holographic/SettingsContext.tsx` | `fontId`، `editLayout`، آفست‌های ساعت/دما/متن |
| `src/holographic/SettingsPanel.tsx` | بخش «فونت نوشته‌ها» + بخش «چیدمان صفحه» |
| `src/holographic/ClockWidget.tsx` | حذف فونت ثابت + قابل‌جابجایی |
| `src/holographic/QuoteWidget.tsx` | حذف فونت ثابت + قابل‌جابجایی |
| `src/holographic/TopLeftBar.tsx` | دما قابل‌جابجایی |
| `src/holographic/HolographicHome.tsx` | غیرفعال‌کردن چرخش در حالت ویرایش + نوار «تمام» |

> نکته: فونت‌های جدید فایل native دارند؛ برای دیدن نتیجه باید اپ **دوباره build** شود (ری‌لود متروپلی کافی نیست). انتخاب فونت و موقعیت‌ها فعلاً در حافظه‌اند و با بستن اپ ریست می‌شوند (مثل بقیه‌ی تنظیمات).

---

## نسخه‌ی جدید — محافظ صفحه (Screen Saver / Daydream)

هدف: وقتی گوشی بی‌کار/در حال شارژ به حالت **محافظ صفحه** می‌رود، همین صحنه‌ی هولوگرافیک **زنده** اجرا شود — بدون بازنویسی native صحنه.

### مکانیزم
- API درست اندروید برای «محافظ صفحه» یک **`DreamService`** است. سرویس جدید [HolographicDreamService.kt](../android/app/src/main/java/com/wallpaper/HolographicDreamService.kt) همان کامپوننت ریشه‌ی RN («Wallpaper») را به‌صورت یک **Fabric Surface** داخل پنجره‌ی Dream میزبانی می‌کند (سازگار با New Architecture / bridgeless در RN 0.86).
  - از `reactHost.createSurface(this, "Wallpaper", initialProps)` سپس `surface.start()` استفاده می‌شود؛ چرخه‌ی حیات با `onHostResume/onHostPause` مدیریت می‌شود.
  - `isInteractive=false`, `isFullscreen=true`, `isScreenBright=true` تا حس واقعی محافظ صفحه بدهد (لمس، آن را می‌بندد).
- ثبت سرویس در [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml) با اکشن `android.service.dreams.DreamService`، مجوز `BIND_DREAM_SERVICE` و متادیتای [res/xml/dream_info.xml](../android/app/src/main/res/xml/dream_info.xml) (که «تنظیمات» محافظ صفحه را به خودِ اپ وصل می‌کند).

### حالت «dream» در سمت JS
- سرویس یک initial prop به‌نام `mode = "dream"` می‌فرستد.
- [App.tsx](../App.tsx) آن را می‌خواند و به `HolographicHome` می‌دهد؛ در حالت dream، **اجزای تعاملی پنهان می‌شوند**: چرخ‌دنده‌ی تنظیمات، باتری، پنل تنظیمات، مودال شهدا و نوار جابجایی.
- ساعت، تاریخ، **دما** و متن پایین دیده می‌شوند (یک محافظ صفحه‌ی تمیز).

### فایل‌های تغییر/اضافه‌شده
| فایل | تغییر |
|------|-------|
| `android/.../HolographicDreamService.kt` | **جدید** — میزبانی صحنه‌ی RN در محافظ صفحه |
| `android/.../res/xml/dream_info.xml` | **جدید** — متادیتای Dream |
| `android/app/src/main/AndroidManifest.xml` | ثبت `<service>` محافظ صفحه |
| `App.tsx` | خواندن prop `mode` و پاس‌دادن `dream` |
| `src/holographic/HolographicHome.tsx` | پنهان‌کردن اجزای تعاملی در حالت dream |
| `src/holographic/TopLeftBar.tsx` | نگه‌داشتن دما و پنهان‌کردن باتری/چرخ‌دنده در dream |

### نحوه‌ی فعال‌سازی روی گوشی
۱. اپ را **rebuild** کن: `npx react-native run-android` (فایل‌های native اضافه شده‌اند).
۲. در گوشی: **تنظیمات → صفحه‌نمایش → محافظ صفحه (Screen saver)** → این اپ را انتخاب کن.
۳. با **«شروع اکنون»** یا وصل‌کردن شارژر/داک، محافظ صفحه اجرا می‌شود.

> ⚠️ نکته‌ی مهم: میزبانی یک Surface کامل RN (New Architecture) داخل `DreamService` **پیشرفته** است و باید روی دستگاه واقعی تست شود؛ اگر در اجرا خطای theme/lifecycle دیدی، خروجی `adb logcat` را بده تا اصلاح کنم. همچنین بعضی گوشی‌ها محافظ صفحه را فقط هنگام **شارژ/داک** اجرا می‌کنند.

---

## نسخه‌ی جدید — والپیپر صفحه‌ی قفل (تصویر ثابت)

هدف: بتوان پس‌زمینه‌ی هولوگرافیک فعلی را روی **صفحه‌ی قفلِ خودِ سیستم** گذاشت.

> چرا ثابت؟ اندروید به اپ‌ها اجازه‌ی **انیمیشن زنده روی صفحه‌ی قفل** نمی‌دهد؛ فقط یک **تصویر ثابت** (یا Live Wallpaper سیستمی که آن هم روی قفلِ اکثر گوشی‌ها فریز می‌شود). پس یک فریم از صحنه می‌گیریم و ست می‌کنیم.

### مکانیزم
- ماژول native [LockWallpaperModule.kt](../android/app/src/main/java/com/wallpaper/LockWallpaperModule.kt): با **`PixelCopy`** یک فریم از پنجره‌ی اپ می‌گیرد (برخلاف `View.draw`، محتوای Skia/GL Surface را هم می‌گیرد) و با `WallpaperManager.setBitmap(..., FLAG_LOCK)` روی صفحه‌ی قفل ست می‌کند.
- ثبت ماژول: [LockWallpaperPackage.kt](../android/app/src/main/java/com/wallpaper/LockWallpaperPackage.kt) به‌صورت دستی در [MainApplication.kt](../android/app/src/main/java/com/wallpaper/MainApplication.kt) اضافه شد.
- مجوز `android.permission.SET_WALLPAPER` به [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml) اضافه شد (مجوز عادی، بدون پرامپت زمان اجرا).
- پل JS: [lockWallpaper.ts](../src/holographic/lockWallpaper.ts) — تابع `setLockScreenWallpaper()` روی `NativeModules.LockWallpaper`.

### جریان «گرفتن تصویرِ تمیز»
- در [HolographicHome.tsx](../src/holographic/HolographicHome.tsx) یک state به‌نام `capturing` اضافه شد. هنگام تنظیم والپیپر:
  ۱. پنجره‌ی تنظیمات بسته می‌شود، `capturing=true` می‌شود.
  ۲. **ساعت، متن پایین و نوار بالا موقتاً پنهان** می‌شوند تا فقط **پس‌زمینه** در تصویر بیفتد (ساعتِ ثابت داخل والپیپر بد است؛ ساعتِ خودِ سیستم روی آن می‌نشیند).
  ۳. بعد از ~۵۵۰ms فریم گرفته و ست می‌شود، سپس `capturing=false`.
- در [SettingsPanel.tsx](../src/holographic/SettingsPanel.tsx) بخش **«صفحه‌ی قفل»** با دکمه‌ی **«🔒 تنظیم والپیپر صفحه‌ی قفل»** اضافه شد.

### فایل‌های تغییر/اضافه‌شده
| فایل | تغییر |
|------|-------|
| `android/.../LockWallpaperModule.kt` | **جدید** — گرفتن فریم با PixelCopy + ست‌کردن FLAG_LOCK |
| `android/.../LockWallpaperPackage.kt` | **جدید** — ثبت ماژول |
| `android/.../MainApplication.kt` | افزودن `LockWallpaperPackage()` |
| `android/app/src/main/AndroidManifest.xml` | مجوز `SET_WALLPAPER` |
| `src/holographic/lockWallpaper.ts` | **جدید** — پل JS |
| `src/holographic/HolographicHome.tsx` | حالت `capturing` + پنهان‌کردن chrome + هندلر |
| `src/holographic/SettingsPanel.tsx` | بخش «صفحه‌ی قفل» + دکمه |

### نحوه‌ی استفاده
۱. اپ را **rebuild** کن (`npx react-native run-android`) چون کد native اضافه شده.
۲. اپ را باز کن → ⚙ تنظیمات → بخش **«صفحه‌ی قفل»** → **«🔒 تنظیم والپیپر صفحه‌ی قفل»**.
۳. گوشی را قفل کن؛ پس‌زمینه‌ی هولوگرافیک روی صفحه‌ی قفل دیده می‌شود.

> نکته: چون ماژول native است، تا قبل از rebuild دکمه پیام «ماژول در دسترس نیست» می‌دهد (به‌جای کرش). در RN 0.86 (bridgeless) این ماژولِ کلاسیک از طریق لایه‌ی interop شناسایی می‌شود؛ اگر شناسایی نشد خروجی logcat را بده.

---

## نسخه‌ی جدید — بخش «نمایش روی گوشی» در تنظیمات (قفل + اصلی + محافظ صفحه + لانچر)

همه‌ی راه‌های نمایش والپیپر روی گوشی، در یک بخش تنظیمات جمع شد: [SettingsPanel.tsx](../src/holographic/SettingsPanel.tsx) → **«نمایش روی گوشی»**.

### دکمه‌ها و کارکردشان
- **والپیپر (تصویر ثابت):** سه دکمه‌ی **🔒 قفل / 🏠 اصلی / 🔒🏠 هردو**. یک فریم تمیز از پس‌زمینه گرفته و روی هدفِ انتخابی ست می‌شود.
- **🖥️ محافظ صفحه:** تنظیمات Screen Saver اندروید را باز می‌کند تا کاربر این اپ را انتخاب کند.
- **🏠 لانچر:** تنظیمات صفحه‌ی خانه (Home) را باز می‌کند تا کاربر این اپ را به‌عنوان لانچر بگذارد.

### تغییرات فنی
- ماژول native تعمیم یافت: [LockWallpaperModule.kt](../android/app/src/main/java/com/wallpaper/LockWallpaperModule.kt) → متد `setWallpaperFromScreen(which)` با مقادیر `"lock"`/`"home"`/`"both"` که به `FLAG_LOCK` / `FLAG_SYSTEM` / هر دو نگاشت می‌شود.
- پل JS: [lockWallpaper.ts](../src/holographic/lockWallpaper.ts) → `setDeviceWallpaper(target)` با نوع `WallpaperTarget`.
- فایل جدید [systemScreens.ts](../src/holographic/systemScreens.ts): با `Linking.sendIntent` صفحه‌های سیستمی را باز می‌کند:
  - محافظ صفحه → `android.settings.DREAM_SETTINGS`
  - لانچر → `android.settings.HOME_SETTINGS` (با fallback به تنظیمات کلی).
- برای این‌که اپ در لیست لانچرها **قابل‌انتخاب** شود، یک `intent-filter` با `category.HOME` + `category.DEFAULT` به `MainActivity` در [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml) اضافه شد (فیلتر `LAUNCHER` هم می‌ماند تا آیکون در درایور بماند).
- [HolographicHome.tsx](../src/holographic/HolographicHome.tsx): هندلر `setWallpaper(target)` (تعمیم‌یافته) — حالت `capturing` chrome را پنهان می‌کند، فریم می‌گیرد، و پیام موفقیت متناسب با هدف می‌دهد.

### فایل‌های تغییر/اضافه‌شده
| فایل | تغییر |
|------|-------|
| `src/holographic/systemScreens.ts` | **جدید** — باز کردن تنظیمات محافظ صفحه / لانچر |
| `android/.../LockWallpaperModule.kt` | `setWallpaperFromScreen(which)` = قفل/اصلی/هردو |
| `src/holographic/lockWallpaper.ts` | `setDeviceWallpaper(target)` |
| `android/app/src/main/AndroidManifest.xml` | افزودن `intent-filter` خانه (HOME) |
| `src/holographic/HolographicHome.tsx` | هندلر `setWallpaper(target)` |
| `src/holographic/SettingsPanel.tsx` | بخش «نمایش روی گوشی» با همه‌ی دکمه‌ها |

> ⚠️ لانچر: چون اپ فعلاً **مدیریت اپ‌ها/آیکون‌ها را ندارد**، اگر آن را لانچر پیش‌فرض کنی فقط صحنه را می‌بینی؛ برای بازگشت باید لانچر پیش‌فرض گوشی را عوض کنی (در هینت زیر دکمه هم نوشته شده). همه‌ی این‌ها بعد از **rebuild** فعال می‌شوند.

---

## رفع باگ — اعمال‌نشدن تغییر فونت (به‌خصوص روی متن‌های bold)

### علامت
تغییر فونت در تنظیمات روی بعضی متن‌ها (مثل خط بزرگ پایین و ساعت) اعمال نمی‌شد.

### دو ریشه‌ی واقعی
۱. **پچ سراسری فقط هنگام mount مطمئن بود:** روی New Architecture، مانکی‌پچِ `Text.render` برای re-renderِ زنده قابل‌اتکا نبود.
۲. **تداخل `fontFamily` سفارشی با `fontWeight` در اندروید:** اگر یک فونت اَسِتِ سفارشی همراه با `fontWeight` بدهی، اندروید داخل آن خانواده دنبال وزن منطبق می‌گردد و چون ttfها تک‌وزنه‌اند، **به فونت سیستم برمی‌گردد**. برای همین متن‌های وزن‌دار (ساعت، خط بزرگ `line2` با وزن ۷۰۰) فونت سفارشی نمی‌گرفتند، ولی متن بی‌وزن (`line1`) می‌گرفت.

### راه‌حل
[AppText.tsx](../src/holographic/AppText.tsx) بازنویسی شد تا:
- فونت را **مستقیم از `useSettings()` بخواند** — چون context consumer است، با هر تغییر فونت خودش دوباره رندر و اعمال می‌شود (قطعی، بدون اتکا به پچ سراسری).
- ابتدا از روی `fontWeight` فایل ttf درست را انتخاب کند (`familyForWeight`)، سپس **`fontWeight` را حذف کند** تا اندروید همان ttf را مستقیم استفاده کند و fallback نکند.
- اگر خود استایل `fontFamily` صریح داشته باشد (مثل تراشه‌های پیش‌نمایش فونت)، دست‌نخورده بماند.

### تأیید روی امولاتور
با تنظیم موقت فونت پیش‌فرض روی «لاله‌زار» و «امیری»، **همه‌ی متن‌ها از جمله ساعت و خط بزرگ پایین (وزن ۷۰۰)** درست با فونت انتخابی رندر شدند.

### فایل تغییرکرده
| فایل | تغییر |
|------|-------|
| `src/holographic/AppText.tsx` | خواندن فونت از context + حذف `fontWeight` هنگام اعمال ttf سفارشی |

> این اصلاح فقط JS است (نیاز به rebuild نیتیو ندارد؛ فقط reload). پچ `setupFonts` به‌عنوان fallback برای `<Text>`های خام باقی می‌ماند و با AppText تداخل ندارد.

---

## بهبود — حذف آواتارهای مداری از تصویر والپیپر

هنگام گرفتن تصویر برای والپیپر صفحه‌ی قفل/اصلی، علاوه بر ساعت/متن/نوار بالا، حالا **آواتارهای مداری شهدا (`OrbitLayer`) هم پنهان می‌شوند** تا والپیپر یک **پس‌زمینه‌ی تمیز** (پرتره + توپوگرافی + ذرات + وینیت) باشد، بدون آیکون‌های شناور.

| فایل | تغییر |
|------|-------|
| `src/holographic/HolographicHome.tsx` | گارد `!capturing` روی `OrbitLayer` |

> فقط JS — نیاز به rebuild ندارد.

---

## نسخه‌ی جدید — فروشگاه والپیپر (کاتالوگ + دانلود + پرداخت کافه‌بازار)

هدف: کاربر بتواند والپیپرهای بیشتری از سرور دانلود کند؛ **۱۰ تای اول رایگان**، بقیه پشت **یک خرید یک‌باره‌ی «باز کردن همه»** (`premium_unlock`) در **کافه‌بازار**.

### معماری
- **مالکیت خرید سمت دستگاه:** کافه‌بازار (Poolakey) خودش نگه می‌دارد؛ برای «کی چه خریده» سرور/اکانت لازم نیست. نقش سرور فقط **کاتالوگ + میزبانی تصاویر** است — اسپک کامل در [BACKEND.md](./BACKEND.md).

### سمت کلاینت (React Native) — ساخته شد
- `src/holographic/store/`:
  - [types.ts](../src/holographic/store/types.ts) — مدل `Catalog`/`WallpaperItem`.
  - [config.ts](../src/holographic/store/config.ts) — `CATALOG_URL`، `PREMIUM_SKU`، `BAZAAR_RSA_PUBLIC_KEY`.
  - [catalog.ts](../src/holographic/store/catalog.ts) — گرفتن کاتالوگ از سرور.
  - [billing.ts](../src/holographic/store/billing.ts) — پل JS به Poolakey (اگر ماژول نیتیو نبود، gracefully آیتم‌های رایگان کار می‌کنند).
  - [StoreContext.tsx](../src/holographic/store/StoreContext.tsx) — state کاتالوگ + entitlement (`premiumUnlocked`, `isUnlocked`, `buyUnlock`).
- [WallpaperGallery.tsx](../src/holographic/WallpaperGallery.tsx) — صفحه‌ی گالری: grid تصاویر، دسته‌بندی، بَج قفل روی آیتم‌های پولی، پیش‌نمایش + سه اکشن (پس‌زمینه‌ی اپ / قفل / اصلی)، و بنر «باز کردن همه».
- ورودی گالری: دکمه‌ی **«🖼️ گالری والپیپرها»** بالای [SettingsPanel.tsx](../src/holographic/SettingsPanel.tsx).
- اعمال والپیپر دانلودی: برای پس‌زمینه‌ی اپ → `customBackgroundUri` (بارگذاری مستقیم URL)؛ برای قفل/اصلی → ماژول نیتیو دانلود+ست.

### سمت نیتیو (Android) — ساخته و **کامپایل شد** ✅
- [LockWallpaperModule.kt](../android/app/src/main/java/com/wallpaper/LockWallpaperModule.kt): متد جدید `setWallpaperFromUrl(url, which)` — دانلود با `HttpURLConnection` → `WallpaperManager`.
- [BazaarBillingModule.kt](../android/app/src/main/java/com/wallpaper/BazaarBillingModule.kt): پل **Poolakey 2.2.0** — `connect / getPurchasedProducts / purchase(sku)`. خرید از طریق `activityResultRegistry`ِ `MainActivity` اجرا می‌شود (بدون onActivityResult دستی).
- ثبت در [LockWallpaperPackage.kt](../android/app/src/main/java/com/wallpaper/LockWallpaperPackage.kt).
- گریدل: repo **JitPack** در [android/build.gradle](../android/build.gradle) + وابستگی `com.github.cafebazaar.Poolakey:poolakey:2.2.0` و `androidx.appcompat` در [app/build.gradle](../android/app/build.gradle).
- صحت‌سنجی: `./gradlew :app:compileDebugKotlin` = **BUILD SUCCESSFUL** (jitpack + پولاکی + کد ماژول همه سالم).

### کارهای باقی‌مانده (سمت تو)
1. **Go:** storage + `GET /api/v1/catalog` (اسپک در [BACKEND.md](./BACKEND.md))؛ بعد `CATALOG_URL` را بده.
2. **پنل کافه‌بازار:** ثبت اپ `com.wallpaper`، تعریف SKU غیرمصرفی `premium_unlock`، گرفتن **RSA Public Key** و دادنش به من (در `BazaarBillingModule.RSA_PUBLIC_KEY` و `config.ts`).
3. **تست پرداخت:** فقط روی گوشی واقعی با اپ کافه‌بازار نصب‌شده ممکن است (امولاتور بدون بازار → خرید غیرفعال، ولی آیتم‌های رایگان کار می‌کنند).

> بخش کاتالوگ/دانلود همین حالا با یک `CATALOG_URL` معتبر قابل‌تست است؛ بخش پرداخت به rebuild + گوشی با بازار نیاز دارد.
