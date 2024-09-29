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
  ) => {
    if (!nextEvent) return classes.solidMatch;

    let baseClass: string;
    if (currentEvent.type === "match" && nextEvent.type === "ban") {
      baseClass = classes.gradientMatchToBan;
    } else if (currentEvent.type === "ban" && nextEvent.type === "match") {
      baseClass = classes.gradientBanToMatch;
    } else if (currentEvent.type === "ban" && nextEvent.type === "ban") {
      baseClass = classes.solidBan;
    } else if (currentEvent.type === "ban" && nextEvent.type === "unban") {
      baseClass = classes.gradientBanToUnban;
    } else if (currentEvent.type === "unban" && nextEvent.type === "ban") {
      baseClass = classes.gradientUnbanToBan;
    } else if (currentEvent.type === "unban" && nextEvent.type === "match") {
      baseClass = classes.gradientUnbanToMatch;
    } else {
      baseClass = classes.solidMatch;
    }
    return baseClass;
  };

  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const firstBan = events.find((event) => event.type === "ban");
  const displayedEvents = [firstEvent, firstBan, lastEvent].filter(
    (event) => event !== undefined,
  );

  // copy an event for a test
  const copyEvent = { ...firstEvent };
  copyEvent.type = "unban";

  displayedEvents.push(firstEvent);
  displayedEvents.push(lastEvent);
  displayedEvents.push(copyEvent);
  displayedEvents.push(lastEvent);
  displayedEvents.push(firstEvent);

  return (
    <Group h={"100%"} w={"100%"}>
      <div id={"timeline"} className={classes.timeline}>
        {displayedEvents.map((item, index) => {
          if (!item) return null;
          const isTop = index % 2 !== 0;
          const nextEvent = displayedEvents[index + 1];
          const hasIntermediateEvents =
            nextEvent &&
            events.findIndex((e) => e === item) !==
              events.findIndex((e) => e === nextEvent) - 1;
          const numberOfIntermediateEvents = events.filter(
            (e) =>
              e.date > item.date &&
              e.date < nextEvent?.date &&
              e !== item &&
              e !== nextEvent,
          ).length;

          console.log('hasIntermediateEvents:', hasIntermediateEvents);

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
            [classes.isUnban]: item.type === "unban",
            [gradientClass]: true,
            [classes.noBar]: index === displayedEvents.length - 1,
          });

          return (
            <div key={index} className={cx(classes.swiperSlide)}>
              <div className={classes.top}>{isTop ? text : null}</div>

              <div className={concatClasses}>
                {!isTop ? text : <div />}
                {hasIntermediateEvents ? (
                  <div className={classes.intermediateEvents}>
                    {numberOfIntermediateEvents}
                  </div>
                ) : (
                  <div />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Group>
  );
}
