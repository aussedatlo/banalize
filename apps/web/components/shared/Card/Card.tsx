import { Paper as MantinePaper, PaperProps } from "@mantine/core";
import { PropsWithChildren } from "react";
import classes from "./Card.module.css";

export const Card = (props: PaperProps & PropsWithChildren) => {
  return (
    <MantinePaper radius="md" withBorder className={classes.root} {...props}>
      {props.children}
    </MantinePaper>
  );
};
