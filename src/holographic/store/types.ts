/** A wallpaper category (for filtering the gallery). */
export type WallpaperCategory = {
  id: string;
  title: string;
};

/** One downloadable wallpaper from the catalog server. */
export type WallpaperItem = {
  id: string;
  title: string;
  /** Category id (matches a WallpaperCategory.id). */
  category: string;
  /** Free (false) or behind the premium unlock (true). */
  premium: boolean;
  /** Small preview image URL (WebP) shown in the grid. */
  thumb: string;
  /** Full-resolution image URL used when applying the wallpaper. */
  full: string;
  width?: number;
  height?: number;
  bytes?: number;
};

/** The whole catalog as returned by `GET /api/v1/catalog`. */
export type Catalog = {
  /** Bumped by the server whenever the catalog changes (for caching). */
  version: number;
  categories: WallpaperCategory[];
  wallpapers: WallpaperItem[];
};

/** One martyr from `GET /api/v1/martyrs`. */
export type MartyrItem = {
  id: string;
  name: string;
  martyrdom: string;
  born: string;
  martyredOn: string;
  place: string;
  will: string;
  photo: string;
  sortOrder: number;
  isActive: boolean;
  /** Id of the MartyrCategory this martyr belongs to; '' when uncategorized. */
  categoryId: string;
};

/** One martyr category from `GET /api/v1/martyr-categories` (e.g. "شهدای شاخص"). */
export type MartyrCategory = {
  id: string;
  title: string;
  sortOrder: number;
};

/** One quote from `GET /api/v1/quotes`. */
export type QuoteItem = {
  id: string;
  line1: string;
  line2: string;
  source: string;
  sortOrder: number;
  isActive: boolean;
};

/** The hero/leader config from `GET /api/v1/hero`. */
export type HeroData = {
  title: string;
  slogan: string;
  image: string;
};
