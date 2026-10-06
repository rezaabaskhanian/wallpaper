import React from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import AppText from './AppText';
import {SET_WALLPAPER_LABEL} from './OneTapWallpaperButton';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type GuideItem = {title: string; desc: string};
type GuideSection = {icon: string; title: string; items: GuideItem[]};

/**
 * Every action the app supports, one by one: the home-screen moods, the
 * gesture-driven main scene, SettingsPanel's four tabs and the gallery —
 * kept in sync by hand since it just narrates what those screens already do.
 */
const SECTIONS: GuideSection[] = [
  {
    icon: '😊',
    title: 'مودها (صفحه اصلی)',
    items: [
      {
        title: 'انتخاب مود',
        desc: 'پایین صفحه اصلی، زیر «امروز چه حالی داری؟»، روی یکی از مودها (مثل شاد، دارک یا aesthetic) بزن تا یه والپیپر رندوم از همون حال‌وهوا تمام‌صفحه باز بشه.',
      },
      {
        title: 'بذار روی گوشیم',
        desc: 'والپیپری که می‌بینی با یه لمس روی صفحه قفل و صفحه اصلی گوشیت گذاشته می‌شه.',
      },
      {
        title: 'یکی دیگه',
        desc: 'یه والپیپر دیگه از همون مود نشونت می‌ده؛ تا همه رو نبینی تکراری نمیاد.',
      },
      {
        title: 'هر روز خودش عوض کنه',
        desc: 'زیر دکمه‌ها روشنش کن تا از فردا هر روز یه والپیپر تازه از همون مود خودکار روی گوشیت بیاد، حتی وقتی اپ بسته‌ست. برای خاموش کردن دوباره همون رو بزن. اینترنت لازمه.',
      },
      {
        title: 'اشتراک‌گذاری',
        desc: 'دکمه‌ی اشتراک بالای صفحه، لینک والپیپر و اپ رو برای دوستات می‌فرسته.',
      },
      {
        title: 'والپیپرهای ویژه',
        desc: 'بعضی والپیپرها قفل‌اند؛ روی اون‌ها به‌جای «بذار روی گوشیم»، دکمه‌ی باز کردن همه‌ی والپیپرها میاد.',
      },
    ],
  },
  {
    icon: '🖐️',
    title: 'صحنه‌ی اصلی',
    items: [
      {
        title: 'چرخاندن با انگشت',
        desc: 'با کشیدن انگشت روی صفحه، حلقه‌های دور مرکز رو دستی می‌چرخونی؛ با رها کردن، چرخش کم‌کم می‌ایسته.',
      },
      {
        title: 'باز کردن اطلاعات هر آیتم',
        desc: 'روی هر کدوم از آیتم‌های در حال چرخش بزن تا کارت اطلاعاتش باز بشه.',
      },
      {
        title: 'باز کردن کشوی اپ‌ها',
        desc: 'دستگیره‌ی پایین صفحه رو به بالا بکش یا روش بزن تا فهرست همه‌ی اپ‌ها باز بشه؛ بالای همون صفحه جست‌وجو هست. انگشتت رو روی هر اپ نگه دار تا «اطلاعات اپ»، «حذف» و «پنهان کردن» بیاد.',
      },
      {
        title: 'ورود به تنظیمات',
        desc: 'آیکون چرخ‌دنده بالای صفحه تنظیمات رو باز می‌کنه. برای بستن، برگه رو به پایین بکش، بیرونش رو بزن یا دکمه‌ی برگشت گوشی رو بزن.',
      },
    ],
  },
  {
    icon: '🏠',
    title: 'تنظیمات ▸ خانه',
    items: [
      {
        title: 'والپیپر زنده روی گوشیم',
        desc: `صحنه‌ی فعلی می‌شه والپیپر زنده‌ی صفحه اصلی گوشیت؛ در صفحه‌ی بعد دکمه‌ی ${SET_WALLPAPER_LABEL} رو بزن.`,
      },
      {
        title: 'حالت‌های آماده',
        desc: 'ساده، آرام، بارانی، شب و هوشمند: هر کدوم با یه لمس چند جلوه رو با هم عوض می‌کنه. تا ۵ ثانیه بعد با «برگردان» به حالت قبل برمی‌گردی.',
      },
      {
        title: 'ذخیره حالت فعلی',
        desc: 'آخرین کارت ردیف حالت‌ها: ظاهر فعلی رو با یه اسم ذخیره کن تا بعداً با یه لمس برگردی. با ضربدر کنار کارتت حذفش کن.',
      },
      {title: 'گالری والپیپرها', desc: 'همه‌ی والپیپرها رو اینجا می‌بینی (پایین‌تر توضیح داده شده).'},
      {
        title: 'عکس صفحه قفل',
        desc: 'اندروید روی صفحه قفل فقط عکس ثابت می‌ذاره؛ این دکمه صحنه‌ی فعلی رو عکس صفحه قفل می‌کنه.',
      },
      {title: 'نمایش موقع شارژ', desc: 'موقع شارژ، صحنه‌ی زنده به‌جای محافظ صفحه پخش می‌شه.'},
    ],
  },
  {
    icon: '🎨',
    title: 'تنظیمات ▸ ظاهر',
    items: [
      {
        title: 'پس‌زمینه',
        desc: 'عکس پس‌زمینه رو انتخاب کن، یا «چرخش بین عکس‌های ستاره‌دار» رو روشن کن تا هر بار یکی از عکس‌های ستاره‌دارت بیاد.',
      },
      {
        title: 'جلوه‌ها',
        desc: 'حالت روز و شب، نور خورشید، ذرات نور (شکل، شدت و رنگ)، رنگ خودکار از عکس، تیرگی لبه‌ها، مه، و باران و برف.',
      },
      {
        title: 'حرکت و لمس',
        desc: 'حرکت آرام پس‌زمینه، موج آب با لمس، حرکت با کج‌کردن گوشی و حلقه نور با لمس. «عمق سه‌بعدی» زیر «پیشرفته»ست.',
      },
      {
        title: 'کره و گوی‌ها',
        desc: 'چرخش خودکار، اندازه کره، نمایش و حالت گوی‌ها و تم گوی‌ها. محور، سرعت و تعداد گوی‌ها زیر «پیشرفته»ست.',
      },
      {
        title: 'دکمه‌ی ؟',
        desc: 'کنار هر تنظیمی که دکمه‌ی ؟ داره، بزن تا توضیح کاملش رو ببینی.',
      },
    ],
  },
  {
    icon: '🕒',
    title: 'تنظیمات ▸ ساعت و متن',
    items: [
      {
        title: 'ساعت و تاریخ',
        desc: 'نمایش ساعت و تاریخ، ۱۲ یا ۲۴ ساعته، ارقام فارسی یا انگلیسی، چیدمان، اندازه و رنگ. رنگ تاریخ زیر «رنگ‌های بیشتر»ست.',
      },
      {title: 'فونت', desc: 'فونت فارسی و انگلیسی همه‌ی نوشته‌ها رو عوض کن؛ هر کارت اسم خود فونت رو با همون فونت نشون می‌ده.'},
      {
        title: 'متن پایین صفحه',
        desc: 'نمایش متن پایین، دسته‌ی جمله‌ها، اندازه و رنگ. برای ویجت صفحه اصلی: انگشتت رو روی صفحه اصلی گوشی نگه دار و ویجت «Wallpaper» رو اضافه کن.',
      },
      {
        title: 'هوا و چیدمان',
        desc: 'نمایش دما، و «جابه‌جایی ساعت و متن»: روشنش کن و ساعت، دما یا متن پایین رو با انگشت بکش. «بازنشانی موقعیت‌ها» همه رو سر جای اول برمی‌گردونه.',
      },
    ],
  },
  {
    icon: '➕',
    title: 'تنظیمات ▸ بیشتر',
    items: [
      {
        title: 'لانچر',
        desc: 'با «تنظیم به‌عنوان لانچر» صحنه‌ی زنده صفحه اصلی گوشیت می‌شه؛ هر وقت خواستی همین‌جا «بازگشت به لانچر قبلی» رو بزن.',
      },
      {title: 'راهنمای کار با اپ', desc: 'همین صفحه‌ای که الان می‌بینی.'},
      {title: 'پیش‌نمایش متحرک در گالری', desc: 'والپیپرهای قفل‌شده توی گالری متحرک نشون داده بشن یا نه.'},
      {title: 'ارتباط با سازنده', desc: 'مستقیم توی تلگرام به سازنده‌ی اپ پیام بده.'},
      {title: 'پیشرفته', desc: 'کد تخفیف رو اینجا وارد کن تا همه‌ی والپیپرهای ویژه باز بشن.'},
    ],
  },
  {
    icon: '🖼️',
    title: 'گالری والپیپرها',
    items: [
      {
        title: 'تازه‌ها و محبوب‌ها',
        desc: 'بالای گالری، جدیدترین والپیپرها و اون‌هایی که بیشتر از همه روی گوشی‌ها گذاشته شدن.',
      },
      {
        title: 'دسته‌ها',
        desc: 'هر دسته یه کارت با عکس و تعداد والپیپرهاست؛ بزن تا وارد بشی. زیردسته‌ها همون‌جا بالای صفحه میان. «‹ همه دسته‌ها» یا دکمه‌ی برگشت گوشی برت می‌گردونه.',
      },
      {
        title: 'گذاشتن والپیپر',
        desc: 'روی هر عکس بزن: می‌تونی پس‌زمینه‌ی اپ، صفحه قفل، صفحه اصلی یا هر دو بذاریش، یا به چرخش ستاره‌دارها اضافه‌ش کنی.',
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
