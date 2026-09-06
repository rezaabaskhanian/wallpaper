# دسته‌بندی نقل‌قول‌ها (احادیث / بیانات رهبر / جملات انگیزشی)

خلاصه‌ی تغییرات: نقل‌قول‌ها قبلاً یک لیست تخت بودن، حالا هر نقل‌قول به یک «دسته»
تعلق داره و خودت از پنل ادمین می‌تونی دسته‌ی جدید بسازی (مثل «احادیث» یا
«جملات انگیزشی»). داخل اپ هم کاربر از تنظیمات، دسته‌ی مورد نظرش رو انتخاب
می‌کنه و ویجت پایین صفحه فقط از همون دسته نقل‌قول رندوم نشون می‌ده.

## فایل‌های تغییرکرده/اضافه‌شده

### بک‌اند (Go)
- `backend/internal/repository/postgres/migrations/013_add_quote_categories.sql` **(جدید)**
  جدول `quote_categories` + ستون `category_id` روی `quotes` (دسته‌ی پیش‌فرض
  `rahbar` = «بیانات رهبر» برای داده‌های قبلی)
- `backend/internal/domain/quote/quote.go` — افزودن `Category` و `CategoryID`
- `backend/internal/service/quote/dto/dto.go` — DTOهای دسته
- `backend/internal/service/quote/service.go` / `crud.go` — CRUD دسته‌ها
- `backend/internal/repository/postgres/quote/db.go` — کوئری‌های دسته
- `backend/internal/delivery/httpserver/quote/handler.go` — روت‌های جدید:
  - `GET /api/v1/quote-categories` (عمومی)
  - `GET/POST/PUT/DELETE /api/v1/admin/quote-categories[/:id]`

### پنل ادمین (React)
- `admin/src/pages/QuoteCategories.tsx` **(جدید)** — صفحه‌ی مدیریت دسته‌ها
- `admin/src/hooks/useQuoteCategories.ts` **(جدید)**
- `admin/src/pages/Quotes.tsx` — انتخاب دسته هنگام افزودن/ویرایش + فیلتر جدول
- `admin/src/hooks/useQuotes.ts`, `admin/src/lib/types.ts` — فیلد `categoryId`
- `admin/src/App.tsx`, `admin/src/components/layout/AdminLayout.tsx` — مسیر و
  آیتم منوی «دسته‌های نقل‌قول»

### اپ (React Native)
- `src/holographic/store/types.ts` — نوع `QuoteCategory` + `categoryId` روی `QuoteItem`
- `src/holographic/store/config.ts`, `store/quotes.ts` — فچ `quote-categories`
- `src/holographic/store/StoreContext.tsx` — `quoteCategories` در استور
- `src/holographic/SettingsContext.tsx` — تنظیم جدید `quoteCategoryId`
- `src/holographic/data.ts` — `useActiveQuoteCategoryId()`
- `src/holographic/QuoteWidget.tsx` — فیلتر نقل‌قول‌ها بر اساس دسته‌ی فعال
- `src/holographic/SettingsPanel.tsx` — ردیف انتخاب دسته (فقط وقتی بیش از یک
  دسته وجود داشته باشه نمایش داده می‌شه)

## دستورهای سرور (دیپلوی)

فرض: روی VPS، ریپو از قبل کلون شده و `docker-compose.prod.yml` هر پروژه از
`.env` کنار خودش می‌خونه (همون سرویس‌های فعلی `wallpaper-prod` و
`wallpaper-admin` پشت Traefik مشترک).

```bash
# ۱) کد جدید رو روی سرور بگیر
cd /path/to/Wallpaper   # مسیر واقعی ریپو روی سرور
git pull

# ۲) بک‌اند: ریبیلد و ری‌استارت
cd backend
docker compose -f docker-compose.prod.yml up -d --build
# چون RUN_MIGRATIONS=true تو همین فایل ست شده، مایگریشن 013
# (ساخت جدول quote_categories) خودش موقع بالا اومدن کانتینر اجرا می‌شه —
# نیازی به دستور دستی روی دیتابیس نیست.

# ۳) پنل ادمین: ریبیلد و ری‌استارت
cd ../admin
docker compose -f docker-compose.prod.yml up -d --build

# ۴) لاگ بک‌اند رو چک کن که مایگریشن بدون خطا رد شده
docker logs -f wallpaper_backend_prod
```

اگه خواستی مطمئن بشی مایگریشن واقعاً اجرا شده:

```bash
docker exec -it wallpaper_postgres_prod \
  psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM quote_categories;"
```

باید یک ردیف `rahbar / بیانات رهبر` رو ببینی. بعدش از پنل ادمین
(`admin.wallpaperapp.ir` → «دسته‌های نقل‌قول») می‌تونی دسته‌های «احادیث» و
«جملات انگیزشی» رو اضافه کنی.

## نکته درباره‌ی اپ موبایل

تغییرات سمت اپ (React Native) نیاز به ریلیز جدید در بازار/گوگل‌پلی داره —
دیپلوی بک‌اند/ادمین کافی نیست تا کاربرهای فعلی ویجت انتخاب دسته رو ببینن؛
باید نسخه‌ی جدید اپ ساخته و منتشر بشه.
