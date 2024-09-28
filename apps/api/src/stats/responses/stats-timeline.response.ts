import {
  type StatsTimelineRecord,
  type StatsTimelineResponse as StatsTimelineResponseType,
} from "@banalize/types";

export class StatsTimelineResponse implements StatsTimelineResponseType {
  bans: StatsTimelineRecord;
  matches: StatsTimelineRecord;
}
