export interface AdminLocationItem {
  _id: string;
  coords: { lat: number; lng: number };
  label: string | null;
  isVisible: boolean;
  checkedInAt: string;
  user: {
    _id: string;
    name: string;
    email: string | null;
    avatar: string | null;
    isActive: boolean;
  } | null;
}

export interface LocationStats {
  total: number;
  visible: number;
  hidden: number;
}
