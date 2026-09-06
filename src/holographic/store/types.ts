/** A wallpaper category (for filtering the gallery). */
export type WallpaperCategory = {
  id: string;
  title: string;
  /** Id of the parent category; undefined/null for a top-level category. */
  parentId?: string | null;
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

/** A theme/category for the orbiting home-screen logos (e.g. "شهدا" or "طبیعت"),
 * from `GET /api/v1/orbit-catalog`. When centerImage is set, selecting this
 * category also swaps the central portrait instead of showing the leader. */
export type OrbitCategory = {
  id: string;
  title: string;
  sort: number;
  centerImage?: string;
  centerTitle?: string;
  centerSlogan?: string;
};

/** One orbiting logo/avatar from `GET /api/v1/orbit-catalog`. */
export type OrbitCatalogItem = {
  id: string;
  categoryId: string;
  label: string;
  image: string;
  sort: number;
  isActive: boolean;
};

/** The whole orbit catalog as returned by `GET /api/v1/orbit-catalog`. */
export type OrbitCatalog = {
  categories: OrbitCategory[];
  items: OrbitCatalogItem[];
};

/** One quote from `GET /api/v1/quotes`. */
export type QuoteItem = {
  id: string;
  categoryId: string;
  line1: string;
  line2: string;
  source: string;
  sortOrder: number;
  isActive: boolean;
};

/** A quote category (e.g. "احادیث", "بیانات رهبر", "جملات انگیزشی"), from
 * `GET /api/v1/quote-categories`. The user picks one in settings to decide
 * which quotes populate the bottom-of-screen widget. */
export type QuoteCategory = {
  id: string;
  title: string;
  sort: number;
};

/** The hero/leader config from `GET /api/v1/hero`. */
export type HeroData = {
  title: string;
  slogan: string;
  image: string;
};
