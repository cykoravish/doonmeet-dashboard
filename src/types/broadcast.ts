export interface BroadcastListItem {
  _id: string;
  title: string;
  message: string;
  url: string | null;
  sentByEmail: string;
  recipientCount: number;
  pushSentCount: number;
  readCount: number;
  createdAt: string;
}

export interface BroadcastReader {
  user: { _id: string; name: string; email: string | null; avatar: string | null };
  readAt: string;
}
