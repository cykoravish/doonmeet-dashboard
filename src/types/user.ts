export interface AdminUserListItem {
  _id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: "user" | "guest";
  isGuest: boolean;
  isVerified: boolean;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  bio: string;
  gender: string | null;
  address: string;
  interests: string[];
  guestExpiresAt: string | null;
}

export interface UserActivity {
  communityCount: number;
  eventsCreatedCount: number;
  eventRsvpCount: number;
  reviewCount: number;
  sessionCount: number;
}

export interface AdminUserSession {
  _id: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: string;
  createdAt: string;
}
