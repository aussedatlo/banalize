import { EventType } from "@banalize/types";
import { rem } from "@mantine/core";
import { IconFlag, IconHandOff, IconHandStop } from "@tabler/icons-react";

type EventIconProps = {
  type: EventType;
};

export const EventIcon = ({ type }: EventIconProps) => {
  const iconProps = { style: { width: rem(16), height: rem(16) } };
  switch (type) {
    case "ban":
      return <IconHandStop {...iconProps} />;
    case "match":
      return <IconFlag {...iconProps} />;
    case "unban":
      return <IconHandOff {...iconProps} />;
    default:
      return null;
  }
};
