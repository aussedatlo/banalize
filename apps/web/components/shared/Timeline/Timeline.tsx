import { BanSchema, MatchSchema } from "@banalize/api";
import { Group } from "@mantine/core";
import cx from "clsx";
import classes from "./Timeline.module.css";
export type TimelineEvent = {
  date: Date;
  type: "match" | "ban";
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
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const firstBan = events.find((event) => event.type === "ban");
  const displayedEvents = [firstEvent, firstBan, lastEvent].filter(
    (event) => event !== undefined,
  );

  // 1 event / 2 will be displayed on top and the other on bottom

  // merge two classe swiper-slide swiper-slide-activ

  return (
    <Group h={"100%"} w={"100%"}>
      <div id={"timeline"} className={classes.timeline}>
        {displayedEvents.map((item, index) => {
          if (!item) return null;
          const isTop = index % 2 !== 0;
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

          const concatClasses = cx(classes.bottom, {
            [classes.lastBottom]: index === displayedEvents.length - 1,
            [classes.firstBottom]: index === 0,
            [classes.isBan]: item.type === "ban",
          });
          console.log("concatClasses", concatClasses);

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
