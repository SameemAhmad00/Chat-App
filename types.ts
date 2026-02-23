
export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  photoURL?: string;
  createdAt?: number;
  blocked?: { [uid:string]: true };
  settings?: {
    notifications?: {
      enabled?: boolean;
      sound?: boolean;
    }
  };
  isAdmin?: boolean;
  isBlockedByAdmin?: boolean;
  fcmToken?: string;
}

export interface Contact {
  uid: string;
  username: string;
  photoURL?: string;
}

export interface EnrichedContact extends Contact {
  lastMessage?: { text: string; ts: number };
  unreadCount?: number;
  presence?: 'online' | number;
}

export interface FriendRequest {
  id: string;
  from: string;
  fromUsername: string;
  fromPhotoURL?: string;
  ts: number;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  ts: number;
  status?: 'sent' | 'delivered' | 'read';
  editedAt?: number;
  replyTo?: {
    messageId: string;
    authorUid: string;
    authorUsername: string;
    text: string;
  };
  isDeleted?: boolean;
}

export interface Call {
  id:string;
  type: 'video' | 'voice';
  from: string;
  fromUsername: string;
  fromPhotoURL?: string;
  offer: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  ts: number;
}

export interface CallRecord {
  id: string;
  type: 'video' | 'voice';
  partner: Contact;
  direction: 'incoming' | 'outgoing';
  ts: number;
  duration?: number; // in seconds
}
