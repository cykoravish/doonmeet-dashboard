export type CommunityCategory =
  | "tech"
  | "nature"
  | "food"
  | "photography"
  | "sports"
  | "arts"
  | "general";

export interface CommunityCreator {
  _id: string;
  name: string;
  email: string | null;
  avatar: string | null;
}

export interface AdminCommunityListItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  banner: string | null;
  icon: string | null;
  category: CommunityCategory;
  createdBy: CommunityCreator | null;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
  announcement: { text: string | null; updatedAt: string | null };
}

export interface CommunityStats {
  memberCount: number;
  postCount: number;
}

export interface CommunityMemberItem {
  _id: string;
  joinedAt: string;
  user: {
    _id: string;
    name: string;
    email: string | null;
    avatar: string | null;
    isActive: boolean;
  } | null;
}

export interface CommunityPostItem {
  _id: string;
  content: string;
  commentCount: number;
  createdAt: string;
  author: {
    _id: string;
    name: string;
    email: string | null;
    avatar: string | null;
  } | null;
}
