import { Paper as MantinePaper } from "@mantine/core";
import { PropsWithChildren } from "react";
import classes from "./Paper.module.css";

export const Paper = ({ children }: PropsWithChildren) => {
  return (
    <MantinePaper radius="md" withBorder className={classes.card} mt={20}>
      {children}
    </MantinePaper>
  );
};
