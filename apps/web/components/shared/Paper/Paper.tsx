import {
  Box,
  Divider,
  Group,
  Paper as MantinePaper,
  PaperProps as MantinePaperProps,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { PropsWithChildren } from "react";
import classes from "./Paper.module.css";

type PaperProps = {
  title?: string;
  icon?: React.ReactNode;
  override?: React.ReactNode;
};

export const Paper = ({
  children,
  title,
  icon,
  override,
  ...props
}: MantinePaperProps & PropsWithChildren & PaperProps) => {
  return (
    <MantinePaper
      radius="md"
      withBorder
      className={classes.card}
      p={0}
      {...props}
    >
      {override ? (
        override
      ) : (
        <Group m="md">
          <ThemeIcon color="yellow">{icon}</ThemeIcon>
          <Text fz="h3">{title}</Text>
        </Group>
      )}
      <Divider />
      <Box p="md" className={classes.container}>
        {children}
      </Box>
    </MantinePaper>
  );
};
