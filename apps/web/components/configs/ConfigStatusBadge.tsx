"use client";

import { WatcherStatus, WatcherStatusData } from "@banalize/types";
import { Badge, rem, Tooltip } from "@mantine/core";
import {
  IconExclamationCircle,
  IconLoader3,
  IconSquare,
} from "@tabler/icons-react";
import { useMemo } from "react";

type ConfigStatusBadgeProps = {
  data: WatcherStatusData;
};

export const ConfigStatusBadge = ({ data }: ConfigStatusBadgeProps) => {
  const { status, processedLines } = data;
  const statusColor = useMemo(() => {
    switch (status) {
      case WatcherStatus.INIT:
        return "dark";
      case WatcherStatus.RUNNING:
        return "cyan";
      case WatcherStatus.STOPPED:
        return "pink";
      case WatcherStatus.ERROR:
        return "pink";
      default:
        return "cyan";
    }
  }, [status]);

  const statusTooltip = useMemo(() => {
    switch (status) {
      case WatcherStatus.RUNNING:
        return `${processedLines} lines processed`;
      case WatcherStatus.INIT:
      case WatcherStatus.STOPPED:
      case WatcherStatus.ERROR:
      default:
        return null;
    }
  }, [status, processedLines]);

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

  const StatusBadge = (
    <Badge
      color={statusColor}
      size="md"
      variant="filled"
      leftSection={statusIcon}
    >
      {status}
    </Badge>
  );

  return statusTooltip ? (
    <Tooltip label={statusTooltip} withArrow position="bottom">
      {StatusBadge}
    </Tooltip>
  ) : (
    StatusBadge
  );
};
