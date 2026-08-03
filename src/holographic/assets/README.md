# پوشه‌ی تصاویر والپیپر

عکس پس‌زمینه را اینجا بگذار، مثلاً `background.jpg`، بعد در فایل
[../config.ts](../config.ts) این خط را تغییر بده:

```ts
export const WALLPAPER = {
  background: require('./assets/background.jpg'),
};
```

اگر `background` را `undefined` بگذاری، پس‌زمینه‌ی توپوگرافی نمایش داده می‌شود.
