import {Alert, Linking} from 'react-native';

/**
 * Opens Android's Screen Saver (Daydream) settings so the user can pick this app
 * as their screen saver. Falls back to a hint if the OEM hides that screen.
 */
export async function openScreenSaverSettings(): Promise<void> {
  try {
    await Linking.sendIntent('android.settings.DREAM_SETTINGS');
  } catch {
    Alert.alert(
      'محافظ صفحه',
      'در «تنظیمات → صفحه‌نمایش → محافظ صفحه»، این اپ را انتخاب کن.',
    );
  }
}

/**
 * Opens Android's default-home (launcher) settings so the user can set this app
 * as the home screen. Falls back to the general Settings, then a hint.
 */
export async function openLauncherSettings(): Promise<void> {
  try {
    await Linking.sendIntent('android.settings.HOME_SETTINGS');
  } catch {
    try {
      await Linking.sendIntent('android.settings.SETTINGS');
      Alert.alert(
        'لانچر',
        'در «برنامه‌ها → برنامه‌های پیش‌فرض → برنامهٔ صفحهٔ اصلی»، این اپ را انتخاب کن.',
      );
    } catch {
      Alert.alert(
        'لانچر',
        'در تنظیمات گوشی، بخش «برنامهٔ صفحهٔ اصلی/Home» را باز کن و این اپ را انتخاب کن.',
      );
    }
  }
}
