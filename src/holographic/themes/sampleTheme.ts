import {Image} from 'react-native';
import type {AppTheme} from '../store/types';

/**
 * Built-in sample theme, shown only while the server has no themes yet, so
 * the screens can be tried end to end. Its images are TEMPORARY placeholders
 * (generated, in assets/themes/sample) — real themes come from the admin
 * panel («تم‌های ویجت»).
 */
const uri = (asset: number) => Image.resolveAssetSource(asset).uri;

export const SAMPLE_THEME: AppTheme = {
  id: 'sample-night',
  title: 'شب پرستاره (نمونه)',
  wallpaperUrl: uri(require('../assets/themes/sample/wallpaper.jpg')),
  widgetBgSmall: uri(require('../assets/themes/sample/widget_small.png')),
  widgetBgWide: uri(require('../assets/themes/sample/widget_wide.png')),
  textColor: '#FFFFFF',
  accentColor: '#F5E6B3',
  isPremium: false,
  sort: 0,
  isSample: true,
};
