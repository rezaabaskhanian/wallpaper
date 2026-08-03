# فروشگاه والپیپر — بک‌اند (Go + Echo)

سرویس کاتالوگ والپیپر برای اپ Noor Wallpaper. هم‌سبک با پروژه‌ی آرامینا:
**Clean/DDD** با لایه‌های `domain / service / repository / delivery`، **Echo**، **pgx**،
مهاجرت با **sql-migrate**، و لاگ ساخت‌یافته با **slog**.

## ساختار
```
cmd/main.go                          # نقطه‌ی شروع + wiring
internal/
  config/                            # کانفیگ 12-Factor (env)
  pkg/{logger,richerror}/            # ابزارهای مشترک
  domain/wallpaper/                  # موجودیت‌ها + قوانین (NewWallpaper/NewCategory)
  repository/
    postgres/db.go                   # اتصال pgxpool
    postgres/wallpaper/              # پیاده‌سازی Repository
    postgres/migrations/             # مهاجرت‌های SQL
    migrator/                        # اجراکننده‌ی مهاجرت‌ها
  service/wallpaper/                 # منطق (GetCatalog/CreateWallpaper/CreateCategory) + dto
  delivery/
    httpserver/                      # سرور Echo + میدلورها
    httpserver/wallpaper/            # هندلرها و روت‌ها
    middlware/                       # میدلور کلید ادمین
```

## اندپوینت‌ها
| متد | مسیر | توضیح | محافظت |
|-----|------|-------|--------|
| GET  | `/health`            | سلامت سرویس            | — |
| GET  | `/api/v1/catalog`    | کاتالوگ برای اپ         | عمومی |
| POST | `/api/v1/wallpapers` | افزودن والپیپر          | کلید ادمین |
| POST | `/api/v1/categories` | افزودن/به‌روزرسانی دسته | کلید ادمین |

پاسخ `GET /api/v1/catalog` دقیقاً همان شکلی است که اپ انتظار دارد:
```json
{ "version": 2, "categories": [{"id":"nature","title":"طبیعت"}],
  "wallpapers": [{ "id":"w_001","title":"...","category":"nature","premium":false,
                   "thumb":"...","full":"...","width":1080,"height":2400,"bytes":850000 }] }
```

## اجرا
```bash
cp .env.example .env      # مقادیر را تنظیم کن
make docker-up            # Postgres بالا می‌آید (پورت 5432)
make run                  # مهاجرت‌ها خودکار اجرا و سرور روی :8090 بالا می‌آید
curl localhost:8090/api/v1/catalog
```

افزودن والپیپر (ادمین):
```bash
curl -X POST localhost:8090/api/v1/wallpapers \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <ADMIN_API_KEY>" \
  -d '{"id":"w_013","title":"غروب","category":"nature","premium":true,
       "thumb":"https://cdn/.../w_013_thumb.webp","full":"https://cdn/.../w_013.webp",
       "width":1080,"height":2400,"bytes":900000}'
```

## اتصال به اپ
در [../src/holographic/store/config.ts](../src/holographic/store/config.ts) مقدار `CATALOG_URL`
را به آدرس این سرور بده. روی امولاتور اندروید، `localhost` مکِ تو = `10.0.2.2` است:
`http://10.0.2.2:8090/api/v1/catalog`.

## بعداً (فاز ۳): اعتبارسنجی خرید کافه‌بازار
یک سرویس `service/billing` + اندپوینت `POST /api/v1/validate` که `purchaseToken` را با
Developer API بازار چک کند (جزئیات در [../docs/BACKEND.md](../docs/BACKEND.md)). ساختارش
مثل همین والپیپر است: domain/service/repository/delivery.
