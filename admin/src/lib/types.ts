export type Category = {
  id: string;
  title: string;
  sort: number;
};

export type Wallpaper = {
  id: string;
  title: string;
  category: string;
  premium: boolean;
  thumb: string;
  full: string;
  width: number;
  height: number;
  bytes: number;
  isActive: boolean;
};

export type Martyr = {
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
};

export type Quote = {
  id: string;
  line1: string;
  line2: string;
  source: string;
  sortOrder: number;
  isActive: boolean;
};

export type Hero = {
  title: string;
  slogan: string;
  image: string;
};
