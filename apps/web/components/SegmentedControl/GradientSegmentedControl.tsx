import { SegmentedControl } from "@mantine/core";
import classes from "./GradientSegmentedControl.module.css";

export type GradientSegmentedControlProps = {
  data: string[];
};

export const GradientSegmentedControl = ({
  data,
}: GradientSegmentedControlProps) => {
  return (
    <SegmentedControl radius="lg" size="sm" data={data} classNames={classes} />
  );
};
