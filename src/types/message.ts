export type MessageDto = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: boolean;
  sentAt: string;

  senderUsername?: string;
  senderName?: string;
  senderFirstName?: string;
  senderLastName?: string;

  receiverUsername?: string;
  receiverName?: string;
  receiverFirstName?: string;
  receiverLastName?: string;

  senderActive?: boolean;
  receiverActive?: boolean;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
};

export type SendMessageDto = {
  receiverId: number;
  content: string;
};
