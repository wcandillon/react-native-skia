export type ChatType = {
  id: string;
  messages: MessageType[];
  users: {
    [id: string]: UserType;
  };
};

export type UserType = {
  id: string;
  name: string;
};

export type MessageType = {
  id: string;
  text: string;
  image?: string;
  userId: string; // from users of the chat
};
