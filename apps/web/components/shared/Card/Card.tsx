import { Paper as MantinePaper } from "@mantine/core";
import { PropsWithChildren } from "react";
import classes from "./Card.module.css";

export const Card = ({ children }: PropsWithChildren) => {
  return (
    <MantinePaper radius="md" withBorder className={classes.root}>
      {children}
    </MantinePaper>
  );
};
