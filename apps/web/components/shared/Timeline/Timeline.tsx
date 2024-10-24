"use client";

import { BanSchema, MatchSchema } from "@banalize/api";
import { ActionIcon, Group } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import cx from "clsx";
import { useRef, useState } from "react";
import classes from "./Timeline.module.css";

const EVENTS_TO_SHOW = 5;

export type TimelineEvent = {
  date: Date;
  type: "match" | "ban" | "unban";
  event: MatchSchema | BanSchema;
};

type TimelineProps = {
  events: TimelineEvent[];
};

export function Timeline({ events }: TimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

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

  const bansAndUnbans = events.filter(
    (event) => event.type === "ban" || event.type === "unban",
  );
  const displayedEvents = [firstEvent, ...bansAndUnbans, lastEvent].filter(
    (event, index, self) =>
      event !== undefined && self.indexOf(event) === index,
  );

  const visibleEvents = displayedEvents.slice(
    startIndex,
    startIndex + EVENTS_TO_SHOW,
  );

  const handlePrevious = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleNext = () => {
    setStartIndex(
      Math.min(startIndex + 1, displayedEvents.length - EVENTS_TO_SHOW),
    );
  };

  return (
    <Group h={"100%"} w={"100%"}>
      <ActionIcon
        color={"yellow"}
        onClick={handlePrevious}
        disabled={startIndex === 0}
      >
        <IconChevronLeft size={24} />
      </ActionIcon>
      <div ref={timelineRef} className={classes.timelineContainer}>
        <div id={"timeline"} className={classes.timeline}>
          {visibleEvents.map((item, index) => {
            if (!item) return null;
            const isTop = index % 2 !== 0;
            const nextEvent = displayedEvents[index + 1];
            const isLastEvent = index === displayedEvents.length - 1;

            const intermediateEvents = events.filter(
              (e) =>
                e.date > item.date &&
                (nextEvent ? e.date < nextEvent.date : true) &&
                e !== item &&
                e !== nextEvent,
            );

            const text = (
              <div>
                <span>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </span>
                <span className={classes.date}>{item.date.toDateString()}</span>
              </div>
            );

            const concatClasses = cx([classes.bottom], {
              [classes.lastBottom]: isLastEvent,
              [classes.isBan]: item.type === "ban",
              [classes.isUnban]: item.type === "unban",
              [classes.noBar]: isLastEvent,
            });

            return (
              <div key={index} className={cx(classes.swiperSlide)}>
                <div className={classes.top}>{isTop ? text : null}</div>
                <div className={concatClasses}>
                  {!isTop ? text : <div />}
                  {!isLastEvent && (
                    <div
                      className={cx(
                        classes.eventLink,
                        getGradientClass(item, nextEvent),
                        {
                          [classes.noHover]: hoveredIndex !== index,
                          [classes.gotHover]: intermediateEvents.length > 0,
                        },
                      )}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {intermediateEvents.length > 0 &&
                        hoveredIndex === index && (
                          <div className={classes.intermediateEvents}>
                            +{intermediateEvents.length} events :<br />
                            {
                              intermediateEvents.filter(
                                (e) => e.type === "match",
                              ).length
                            }{" "}
                            match(es) <br />
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ActionIcon
        onClick={handleNext}
        color={"yellow"}
        disabled={startIndex + EVENTS_TO_SHOW >= displayedEvents.length}
      >
        <IconChevronRight size={24} />
      </ActionIcon>
    </Group>
  );
}
