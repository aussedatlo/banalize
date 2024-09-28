import { BanSchema, MatchSchema } from "@banalize/api";
import { Group } from "@mantine/core";
import cx from "clsx";
import classes from "./Timeline.module.css";
export type TimelineEvent = {
  date: Date;
  type: "match" | "ban" | "unban";
  event: MatchSchema | BanSchema;
};

// type EventProps = {
//   timelineEvent: TimelineEvent;
//   type: "match" | "ban";
// };

type TimelineProps = {
  events: TimelineEvent[];
};

export function Timeline({ events }: TimelineProps) {
  const getGradientClass = (
    currentEvent: TimelineEvent,
    nextEvent: TimelineEvent | undefined,
    hasIntermediateEvents: boolean = false,
  ) => {
    if (!nextEvent) return classes.solidMatch;

    let baseClass = '';
    if (currentEvent.type === "match" && nextEvent.type === "ban") {
      baseClass = classes.gradientMatchToBan;
    } else if (currentEvent.type === "ban" && nextEvent.type === "match") {
      baseClass = classes.gradientBanToMatch;
    } else if (currentEvent.type === "ban" && nextEvent.type === "ban") {
      baseClass = classes.solidBan;
    } else {
      baseClass = classes.solidMatch;
    }

    return hasIntermediateEvents ? `${baseClass} ${classes.dottedLine}` : baseClass;
  };

  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const firstBan = events.find((event) => event.type === "ban");
  const displayedEvents = [firstEvent, firstBan, lastEvent].filter(
    (event) => event !== undefined,
  );

  displayedEvents.push(firstEvent);

  return (
    <Group h={"100%"} w={"100%"}>
      <div id={"timeline"} className={classes.timeline}>
        {displayedEvents.map((item, index) => {
          if (!item) return null;
          const isTop = index % 2 !== 0;
          const nextEvent = displayedEvents[index + 1];
          const hasIntermediateEvents = nextEvent && events.findIndex(e => e === item) !== events.findIndex(e => e === nextEvent) - 1;

          const text = (
            <div>
              <span>
                {/* First char uppercase */}
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </span>
              <span className={classes.date}>
                {item.date.toDateString()}
                <span></span>
              </span>
            </div>
          );
          const gradientClass = getGradientClass(item, nextEvent);

          const concatClasses = cx([classes.bottom], {
            [classes.lastBottom]: index === displayedEvents.length - 1,
            [classes.isBan]: item.type === "ban",
            [gradientClass]: true,
            [classes.noBar]: index === displayedEvents.length - 1,
          });

          return (
            <div key={index} className={cx(classes.swiperSlide)}>
              <div className={classes.top}>{isTop ? text : null}</div>

              <div className={concatClasses}>{!isTop ? text : <div />}</div>
            </div>
          );
        })}
      </div>
    </Group>
  );
}
