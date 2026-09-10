import React from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import AppText from './AppText';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type GuideItem = {title: string; desc: string};
type GuideSection = {icon: string; title: string; items: GuideItem[]};

/**
 * Every action the app supports, one by one, grouped the same way as
 * SettingsPanel's tabs plus the gesture-driven parts of the main scene —
 * kept in sync by hand since it just narrates what those screens already do.
 */
const SECTIONS: GuideSection[] = [
  {
    icon: '🖐️',
    title: 'صحنه‌ی اصلی',
    items: [
      {
        title: 'چرخاندن با انگشت',
        desc: 'با کشیدن انگشت روی صفحه، حلقه‌های دور مرکز را دستی می‌چرخانی؛ با رهاکردن، چرخش با شتاب کم‌کم می‌ایستد.',
      },
      {
        title: 'باز کردن اطلاعات هر آیتم',
        desc: 'روی هر کدام از آیتم‌های در حال چرخش (شهدا/موارد دیگر) بزن تا کارت اطلاعاتش باز شود.',
      },
      {
        title: 'باز کردن کشوی اپ‌ها',
        desc: 'دستگیره‌ی پایین صفحه را به‌سمت بالا بکش یا رویش ضربه بزن تا فهرست همه‌ی اپ‌های نصب‌شده باز شود؛ از بالای همان صفحه می‌توانی جست‌وجو کنی و با زدن هر اپ آن را باز کنی.',
      },
      {
        title: 'ورود به تنظیمات',
        desc: 'آیکون چرخ‌دنده در بالای صفحه، پنل تنظیمات را باز می‌کند.',
      },
    ],
  },
  {
    icon: '⚙️',
    title: 'تنظیمات ▸ عمومی',
    items: [
      {
        title: 'فعال‌سازی با کد تخفیف',
        desc: 'کد تخفیف را وارد و فعال کن تا همه‌ی والپیپرهای پرمیوم باز شوند.',
      },
      {title: 'انتخاب تم آماده', desc: 'یکی از تم‌های از پیش‌ساخته را با یک ضربه اعمال کن.'},
      {title: 'رنگ نور', desc: 'رنگ درخشش (glow) صحنه را از میان چند رنگ آماده انتخاب کن.'},
      {title: 'چرخش خودکار', desc: 'روشن/خاموش کردن چرخش خودکار حلقه‌ها.'},
      {title: 'سرعت چرخش', desc: 'با دکمه‌های + و − سرعت چرخش خودکار را کم یا زیاد کن.'},
      {title: 'اندازه کره', desc: 'تعداد حلقه‌های هم‌مرکز نمایش داده‌شده را تنظیم کن.'},
      {title: 'نمایش گوی‌ها', desc: 'گوی‌های در حال چرخش را کلاً نشان بده یا مخفی کن.'},
      {
        title: 'تم اوربیت (دسته‌ی محتوا)',
        desc: 'وقتی چند دسته محتوا موجود باشد (مثلاً شهدا/طبیعت)، از این‌جا دسته را عوض کن.',
      },
      {
        title: 'حالت نمایش گوی‌ها',
        desc: 'بین حالت ثابت یا پیدا و پنهان‌شوندگی (فلیکر) گوی‌ها یکی را انتخاب کن.',
      },
      {title: 'تعداد گوی‌ها', desc: 'با + و − تعداد آیتم‌های نمایش‌داده‌شده روی حلقه‌ها را تغییر بده.'},
      {
        title: 'محور چرخش',
        desc: 'چرخش دور محور X، Y، Z یا حالت ناهمگون (اتمی) را انتخاب کن.',
      },
      {
        title: 'پارالاکس با ژیروسکوپ',
        desc: 'با روشن‌کردن این گزینه، کج‌کردن گوشی هم پس‌زمینه و گوی‌ها را کمی جابه‌جا می‌کند.',
      },
      {
        title: 'پیش‌نمایش متحرک والپیپرهای قفل‌شده',
        desc: 'در گالری، والپیپرهای پرمیوم را به‌صورت پیش‌نمایش متحرک نشان می‌دهد یا نه.',
      },
      {
        title: 'ارتباط با سازنده',
        desc: 'دکمه‌ی تلگرام، مستقیم چت با سازنده‌ی اپ را باز می‌کند.',
      },
    ],
  },
  {
    icon: '🖼️',
    title: 'تنظیمات ▸ پس‌زمینه',
    items: [
      {title: 'انتخاب پس‌زمینه', desc: 'یکی از تصویرهای آماده یا عکس انتخابی از گالری را به‌عنوان پس‌زمینه بگذار.'},
      {
        title: 'حالت روز/شب',
        desc: 'خودکار (بر اساس ساعت واقعی)، همیشه روز، همیشه شب یا خاموش.',
      },
      {title: 'ذرات نور', desc: 'ذرات درخشان پس‌زمینه را خاموش، روشن یا خودکار کن.'},
      {title: 'شدت ذرات', desc: 'میزان تراکم ذرات نور را کم، متوسط یا زیاد تنظیم کن.'},
      {title: 'افکت سینمایی', desc: 'تیرگی لبه‌های صفحه (وینیت) را روشن/خاموش کن.'},
      {title: 'مه', desc: 'مه را خاموش کن یا از پایین، بالا یا هر دو سمت صفحه فعال کن.'},
      {
        title: 'جلوه‌های آب‌وهوا',
        desc: 'باران، برف یا حالت خودکار (بر اساس وضعیت واقعی هوا از GPS) را انتخاب کن؛ حالت خودکار به اینترنت و دسترسی موقعیت نیاز دارد.',
      },
    ],
  },
  {
    icon: '🔤',
    title: 'تنظیمات ▸ فونت',
    items: [
      {
        title: 'انتخاب فونت',
        desc: 'فونت همه‌ی نوشته‌های اپ (ساعت، تاریخ، متن پایین و…) را از میان فونت‌های موجود عوض کن.',
      },
    ],
  },
  {
    icon: '🧩',
    title: 'تنظیمات ▸ ویجت‌ها',
    items: [
      {title: 'نمایش ساعت', desc: 'ساعت روی صحنه را نشان بده یا مخفی کن.'},
      {title: 'نمایش تاریخ', desc: 'تاریخ را نشان بده یا مخفی کن.'},
      {title: 'حالت نمایش ساعت', desc: '۱۲ ساعته یا ۲۴ ساعته.'},
      {
        title: 'نمایش هوا',
        desc: 'دمای زنده (از GPS و سرویس آب‌وهوا) را روی صحنه نشان بده یا مخفی کن.',
      },
      {
        title: 'جابه‌جایی ساعت و متن',
        desc: 'این گزینه را روشن کن، سپس ساعت، دما یا متن پایین را با انگشت روی صحنه بکش تا جای دلخواه بگذاری.',
      },
      {title: 'بازنشانی موقعیت‌ها', desc: 'ساعت، دما و متن پایین را به موقعیت پیش‌فرض برمی‌گرداند.'},
      {title: 'نمایش متن پایین صفحه', desc: 'نقل‌قول/متن پایین صحنه را نشان بده یا مخفی کن.'},
      {
        title: 'دسته‌ی نقل‌قول‌ها',
        desc: 'وقتی چند دسته نقل‌قول موجود باشد، از این‌جا دسته را انتخاب کن.',
      },
    ],
  },
  {
    icon: '📱',
    title: 'تنظیمات ▸ دستگاه',
    items: [
      {
        title: 'تنظیم به‌عنوان والپیپر',
        desc: 'یک تصویر ثابت از پس‌زمینه‌ی فعلی (بدون ساعت و متن) را روی صفحه‌ی قفل، صفحه‌ی اصلی یا هر دو ذخیره کن.',
      },
      {
        title: 'انتخاب به‌عنوان محافظ صفحه',
        desc: 'با زدن این دکمه، تنظیمات سیستم برای محافظ صفحه باز می‌شود؛ با فعال‌کردنش، هنگام شارژ یا بی‌کاری صحنه‌ی زنده‌ی اپ اجرا می‌شود.',
      },
      {
        title: 'تنظیم به‌عنوان صفحه‌ی خانه (لانچر)',
        desc: 'اپ را به‌عنوان لانچر پیش‌فرض گوشی تنظیم می‌کند تا صحنه‌ی زنده پشت آیکون اپ‌ها اجرا شود؛ برای بازگشت، لانچر پیش‌فرض گوشی را از تنظیمات سیستم عوض کن.',
      },
      {
        title: 'چرخش خودکار نقل‌قول ویجت',
        desc: 'ویجت ساعت/نقل‌قول را روی صفحه‌ی اصلی گوشی (نگه‌داشتن انگشت روی صفحه‌ی اصلی → افزودن ویجت → Wallpaper) اضافه کن؛ این سوییچ مشخص می‌کند نقل‌قول ویجت هر بار عوض شود یا ثابت بماند.',
      },
    ],
  },
  {
    icon: '🎁',
    title: 'گالری والپیپرها',
    items: [
      {
        title: 'مرور و دانلود والپیپر',
        desc: 'از دکمه‌ی «گالری والپیپرها» در بالای تنظیمات وارد شو تا والپیپرهای بیشتری را ببینی و انتخاب کنی؛ موارد پرمیوم با کد تخفیف باز می‌شوند.',
      },
    ],
  },
];

export default function HelpGuide({visible, onClose}: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <AppText style={styles.closeBtnText}>بستن</AppText>
          </Pressable>
          <AppText style={styles.title}>راهنمای کار با اپ</AppText>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <AppText style={styles.intro}>
            همه‌ی کارهایی که می‌توانی در این اپ انجام بدهی، بخش‌به‌بخش:
          </AppText>

          {SECTIONS.map(section => (
            <View key={section.title} style={styles.section}>
              <AppText style={styles.sectionTitle}>
                {section.icon} {section.title}
              </AppText>
              {section.items.map(item => (
                <View key={item.title} style={styles.item}>
                  <AppText style={styles.itemTitle}>• {item.title}</AppText>
                  <AppText style={styles.itemDesc}>{item.desc}</AppText>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#170b28ee'},
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  title: {color: '#eafffb', fontSize: 18, fontWeight: '700', writingDirection: 'rtl'},
  closeBtn: {paddingHorizontal: 8, paddingVertical: 4, minWidth: 44},
  closeBtnText: {color: '#c4b5fd', fontSize: 16, textAlign: 'left'},
  content: {padding: 16, paddingBottom: 40},
  intro: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 18,
  },
  section: {
    marginBottom: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
  },
  sectionTitle: {
    color: '#f5e6b3',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  item: {marginBottom: 10},
  itemTitle: {
    color: '#eafffb',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  itemDesc: {
    color: '#d6f5ee',
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
    lineHeight: 19,
  },
});
