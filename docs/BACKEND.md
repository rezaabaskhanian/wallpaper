# بک‌اند فروشگاه والپیپر (اسپک برای Go)

این سند قرارداد بین اپ (React Native) و سرور (Go) را تعریف می‌کند. اپ فقط دو چیز از سرور می‌خواهد: **کاتالوگ** و **میزبانی تصاویر**. مالکیت خریدها را کافه‌بازار (Poolakey) روی دستگاه نگه می‌دارد، پس برای «کی چه خریده» نیازی به دیتابیس کاربر/اکانت نداری.

---

## ۱. ذخیره‌سازی تصاویر
- برای هر والپیپر **دو فایل**: `thumb` (WebP کوچک ~۲۰–۵۰KB برای grid) و `full` (WebP باکیفیت، ابعاد گوشی مثل 1080×2400).
- روی Object Storage ایرانی (آروان/لیارا) + CDN. فایل‌ها public-read.
- نام‌گذاری پیشنهادی: `wp/<id>_thumb.webp` و `wp/<id>.webp`.

## ۲. اندپوینت کاتالوگ
```
GET /api/v1/catalog
Accept: application/json
```
- پاسخ `200` با هدر `ETag: "v<version>"`. اگر کلاینت `If-None-Match` فرستاد و تغییری نبود، `304` بده.
- بدنه:
```json
{
  "version": 12,
  "categories": [
    { "id": "shohada", "title": "شهدا" },
    { "id": "nature",  "title": "طبیعت" }
  ],
  "wallpapers": [
    {
      "id": "w_001",
      "title": "مسیر نور",
      "category": "shohada",
      "premium": false,
      "thumb": "https://cdn.example.ir/wp/w_001_thumb.webp",
      "full":  "https://cdn.example.ir/wp/w_001.webp",
      "width": 1080,
      "height": 2400,
      "bytes": 850000
    }
  ]
}
```
- قانون رایگان/پولی: **۱۰ تای اول `premium:false`**، بقیه `premium:true`. همین کافی است؛ منطق قیمت‌گذاری «باز کردن همه» است (یک SKU).
- نکته: ساده‌ترین شروع، سِرو همین JSON از یک فایل استاتیک روی CDN است؛ بعداً به یک هندلر Go واقعی ارتقا بده.

> در امولاتور اندروید، `localhost` مکِ تو = `10.0.2.2`. برای تست سریع می‌توانی کاتالوگ را روی `http://10.0.2.2:<port>` سرو کنی و `CATALOG_URL` را در [src/holographic/store/config.ts](../src/holographic/store/config.ts) به همان بدهی.

## ۳. ابزار ادمین (اختیاری، برای خودت)
یک CLI/اندپوینت ساده که: تصویر full را می‌گیرد → thumb می‌سازد (resize+WebP) → روی storage آپلود می‌کند → یک رکورد به کاتالوگ اضافه و `version` را یک واحد زیاد می‌کند.

---

## ۴. (فاز ۳ — اختیاری، ضدتقلب) اعتبارسنجی خرید سمت‌سرور
Poolakey روی دستگاه امن است، ولی برای اطمینان بیشتر می‌توانی خرید را با **Developer API کافه‌بازار** هم چک کنی. کلاینت `purchaseToken` را می‌فرستد، سرور تأیید می‌کند.

**قرارداد کلاینت↔سرور (وقتی خواستی اضافه کنم):**
```
POST /api/v1/validate
{ "product_id": "premium_unlock", "purchase_token": "<token>" }
→ 200 { "valid": true }
```

**فراخوانی Developer API بازار از داخل Go:**
1. در پنل بازار یک OAuth client بساز → `client_id`, `client_secret` و یک‌بار `refresh_token` بگیر.
2. گرفتن `access_token` (هر ~۱ ساعت منقضی می‌شود):
```
POST https://pardakht.cafebazaar.ir/devapi/v2/auth/token/
grant_type=refresh_token&client_id=...&client_secret=...&refresh_token=...
→ { "access_token": "...", "expires_in": 3600 }
```
3. اعتبارسنجی خرید درون‌برنامه‌ای:
```
GET https://pardakht.cafebazaar.ir/devapi/v2/api/validate/
    {package_name}/inapp/{product_id}/purchases/{purchase_token}/?access_token=...
→ { "purchaseState": 0, "consumptionState": ..., "purchaseTime": ..., "developerPayload": "" }
```
`purchaseState == 0` یعنی خریداری‌شدهٔ معتبر (۱ = ریفاند/لغو).
- `package_name` اپ = `com.wallpaper`.
- مرجع رسمی: https://developers.cafebazaar.ir (بخش Developer API v2).

> اگر فاز ۳ را خواستی، بگو تا در کلاینت بعد از `purchaseSucceed`، توکن را به `POST /api/v1/validate` تو بفرستم و entitlement را به تأیید سرور گره بزنم.

---

## خلاصهٔ کارِ Go (فاز ۱ و ۲)
1. Storage + CDN راه بینداز.
2. `GET /api/v1/catalog` را سرو کن (اول استاتیک هم اوکی).
3. چند والپیپر (۱۰ رایگان + چند پولی) بگذار.
4. `CATALOG_URL` را به من بده تا در اپ ست کنم و تست کنیم.

سمت پرداخت، کارِ **پنل بازار** با توست: ثبت اپ `com.wallpaper`، تعریف SKU `premium_unlock` (غیرمصرفی)، گرفتن **RSA Public Key** و دادنش به من تا در ماژول Poolakey بگذارم.
