import React from "react";
import { Image } from "react-native";

interface AvatarProps {
  id: string;
  large?: boolean;
}

// The original demo's Firebase Storage avatars went offline (billing lapsed).
// pravatar.cc returns a deterministic photo per `u` seed.
const avatarURI = (id: string, size: number) =>
  `https://i.pravatar.cc/${size * 2}?u=${encodeURIComponent(id)}`;

export const Avatar = ({ id, large }: AvatarProps) => {
  const size = large ? 60 : 40;
  return (
    <Image
      source={{ uri: avatarURI(id, size) }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
};
