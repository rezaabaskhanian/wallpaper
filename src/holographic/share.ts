import {Share} from 'react-native';
import type {WallpaperItem} from './store/types';

const STORE_URL = 'https://cafebazaar.ir/app/com.wallpaperNaghsh';

/** Shares the wallpaper link plus the app's store page — every share is a
 * free install ad. Android's share sheet offers Telegram, Instagram, etc.
 * Best-effort: a dismissed share sheet is not an error. */
export function shareWallpaper(item: Pick<WallpaperItem, 'full'>): void {
  Share.share({
    message: `این والپیپر رو ببین 😍\n${item.full}\n\nکلی والپیپر دیگه تو اپ ریحان:\n${STORE_URL}`,
  }).catch(() => {});
}
