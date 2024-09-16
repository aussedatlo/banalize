import { IconTimelineEvent } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import { Table } from "components/shared/Table/Table";

type ConfigEventsPaperProps = {
  events: { time: string; ip: string; type: string; line: string }[];
};

export const ConfigEventsPaper = ({ events }: ConfigEventsPaperProps) => {
  return (
    <Paper title="Events" icon={<IconTimelineEvent />}>
      <Table headers={["time", "ip", "type", "line"]} items={events} />
    </Paper>
  );
};
