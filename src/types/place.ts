export interface AdminPlaceListItem {
  _id: string;
  title: string;
  slug: string;
  image: string;
  category: string;
  shortDescription: string;
  about: string;
  highlights: string[];
  bestTimeToVisit: string;
  howToReach: string;
  createdAt: string;
  reviewCount: number;
  avgRating: number | null;
}

export interface PlaceStats {
  reviewCount: number;
  avgRating: number | null;
}

export interface PlaceReviewItem {
  _id: string;
  rating: number;
  text: string;
  createdAt: string;
  user: {
    _id: string;
    name: string;
    email: string | null;
    avatar: string | null;
  } | null;
}
