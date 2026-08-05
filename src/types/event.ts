export type EventStatus = "draft" | "published" | "cancelled";

export interface EventCreator {
  _id: string;
  name: string;
  email: string | null;
  avatar: string | null;
}

export interface AdminEventListItem {
  _id: string;
  title: string;
  description: string;
  banner: string | null;
  location: { name: string; address: string; coords: { lat: number | null; lng: number | null } };
  date: string;
  endsAt: string | null;
  tags: string[];
  capacity: number | null;
  status: EventStatus;
  commentCount: number;
  creator: EventCreator | null;
  community: { _id: string; name: string } | null;
  createdAt: string;
}

export interface EventStats {
  rsvpCount: number;
}

export interface EventAttendee {
  _id: string;
  createdAt: string;
  user: {
    _id: string;
    name: string;
    email: string | null;
    avatar: string | null;
    isActive: boolean;
  } | null;
}

export interface EventCommentItem {
  _id: string;
  content: string;
  createdAt: string;
  author: {
    _id: string;
    name: string;
    email: string | null;
    avatar: string | null;
  } | null;
}
