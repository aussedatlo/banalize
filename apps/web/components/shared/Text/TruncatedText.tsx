"use client";

import { Text } from "@mantine/core";
import { PropsWithChildren, useState } from "react";

export const TruncatedText = ({ children }: PropsWithChildren) => {
  const [truncate, setTruncate] = useState(true);
  return (
    <Text
      truncate={truncate}
      onClick={() => setTruncate(!truncate)}
      style={{ cursor: "pointer" }}
    >
      {children}
    </Text>
  );
};
