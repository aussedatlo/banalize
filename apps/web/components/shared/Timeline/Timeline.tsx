"use client";

import { BanSchema, MatchSchema } from "@banalize/types";
import { ActionIcon, Box, Group, Text } from "@mantine/core";
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

  const displayedEvents = [firstEvent, ...bansAndUnbans, lastEvent]
    .filter(Boolean)
    .reduce((unique, event) => {
      const exists = unique.some(
        (e) =>
          e.date.getTime() === event.date.getTime() && e.type === event.type,
      );
      return exists ? unique : [...unique, event];
    }, [] as TimelineEvent[])
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const maxStartIndex = Math.max(0, displayedEvents.length - EVENTS_TO_SHOW);

  const visibleEvents = displayedEvents.slice(
    startIndex,
    startIndex + EVENTS_TO_SHOW,
  );

  const handlePrevious = () => {
    setStartIndex((prevIndex) => Math.max(0, prevIndex - 1));
  };

  const handleNext = () => {
    setStartIndex((prevIndex) => Math.min(prevIndex + 1, maxStartIndex));
  };

  return (
    <Group h={"100%"} w={"100%"}>
      <ActionIcon
        className={classes.nextButton}
        onClick={handlePrevious}
        disabled={startIndex === 0}
      >
        <IconChevronLeft size={17} />
      </ActionIcon>
      <div ref={timelineRef} className={classes.timelineContainer}>
        <div id={"timeline"} className={classes.timeline}>
          {visibleEvents.map((item, index) => {
            if (!item) return null;
            const isTop = index % 2 !== 0;
            const nextEvent = visibleEvents[index + 1];
            const isLastEvent = !nextEvent;

            const intermediateEvents = events.filter(
              (e) =>
                e.date > item.date &&
                (nextEvent ? e.date < nextEvent.date : true) &&
                e !== item &&
                e !== nextEvent,
            );

            const text = (
              <div>
                <Text>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
                <Text className={classes.date}>{item.date.toDateString()}</Text>
              </div>
            );

            const uniqueKey = `${item.date.getTime()}-${item.type}-${index}`;

            const concatClasses = cx([classes.bottom], {
              [classes.lastBottom]: isLastEvent,
              [classes.isBan]: item.type === "ban",
              [classes.isUnban]: item.type === "unban",
              [classes.noBar]: isLastEvent,
            });

            return (
              <div key={uniqueKey} className={cx(classes.swiperSlide)}>
                <div className={classes.top}>{isTop ? text : null}</div>
                <div className={concatClasses}>
                  {!isTop ? text : <div />}
                  {!isLastEvent && (
                    <div
                      className={cx(
                        classes.eventLink,
                        getGradientClass(item, nextEvent),
                      )}
                    >
                      {intermediateEvents.length > 0 && true && (
                        <Box className={classes.intermediateEvents}>
                          <Text>
                            +{" "}
                            {
                              intermediateEvents.filter(
                                (e) => e.type === "match",
                              ).length
                            }{" "}
                            match(es)
                          </Text>
                        </Box>
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
        className={classes.nextButton}
        disabled={startIndex >= maxStartIndex}
      >
        <IconChevronRight size={17} />
      </ActionIcon>
    </Group>
  );
}
