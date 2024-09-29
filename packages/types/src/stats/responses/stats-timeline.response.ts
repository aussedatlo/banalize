import { type StatsTimelineRecord } from "./stats-timeline-record";

export type StatsTimelineResponse = {
  bans: StatsTimelineRecord;
  matches: StatsTimelineRecord;
};
