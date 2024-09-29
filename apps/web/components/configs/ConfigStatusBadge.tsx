"use client";

import { WatcherStatus } from "@banalize/types";
import { Badge, rem } from "@mantine/core";
import {
  IconExclamationCircle,
  IconLoader3,
  IconSquare,
} from "@tabler/icons-react";
import { useMemo } from "react";

export const ConfigStatusBadge = ({ status }: { status: WatcherStatus }) => {
  const statusColor = useMemo(() => {
    switch (status) {
      case WatcherStatus.INIT:
        return "blue";
      case WatcherStatus.RUNNING:
        return "green";
      case WatcherStatus.STOPPED:
        return "gray";
      case WatcherStatus.ERROR:
        return "red";
      default:
        return "gray";
    }
  }, [status]);

  const statusIcon = useMemo(() => {
    const style = { width: rem(14), height: rem(14) };
    switch (status) {
      case WatcherStatus.INIT:
      case WatcherStatus.RUNNING:
        return <IconLoader3 style={style} />;
      case WatcherStatus.STOPPED:
        return <IconSquare style={style} />;
      case WatcherStatus.ERROR:
        return <IconExclamationCircle style={style} />;
      default:
        return <IconLoader3 style={style} />;
    }
  }, [status]);

  return (
    <Badge
      color={statusColor}
      size="md"
      variant="filled"
      leftSection={statusIcon}
    >
      {status}
    </Badge>
  );
};
