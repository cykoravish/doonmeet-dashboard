export interface ChatUser {
  _id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  isActive?: boolean;
}

export interface AdminConversationListItem {
  _id: string;
  participants: ChatUser[];
  lastMessage: { content: string | null; sentAt: string | null; senderId: string | null };
  updatedAt: string;
}

export interface DirectMessageItem {
  _id: string;
  content: string;
  sender: ChatUser | null;
  createdAt: string;
}

export interface RoomMessageItem {
  _id: string;
  content: string;
  sender: ChatUser | null;
  isGuest: boolean;
  createdAt: string;
}
