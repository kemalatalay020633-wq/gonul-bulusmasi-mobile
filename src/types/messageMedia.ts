export type MessageType = "IMAGE" | "VIDEO" | "AUDIO" | "FILE";

export type MessageMediaDto = {
  id: number;
  messageId: number;
  type: MessageType;
  mediaUrl: string;
  fileName?: string;
  mimeType?: string;
};
