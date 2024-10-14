import { EventStatus } from "@banalize/types";
import { Badge } from "@mantine/core";

type StatusBadgeProps = {
  status: EventStatus;
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const badgeProps = {
    size: "md",
    variant: "filled",
    style: { display: "block" },
    color:
      status === EventStatus.ACTIVE
        ? "pink"
        : status === EventStatus.RECENT
          ? "cyan"
          : "dark",
  };
  return <Badge {...badgeProps}>{status}</Badge>;
};
