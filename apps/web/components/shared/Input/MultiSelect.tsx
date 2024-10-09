import {
  MultiSelect as MantineMultiSelect,
  MultiSelectProps,
} from "@mantine/core";
import classes from "./MultiSelect.module.css";

export const MultiSelect = (props: MultiSelectProps) => (
  <MantineMultiSelect
    classNames={{
      pill: classes.pill,
      input: classes.input,
      option: classes.option,
    }}
    {...props}
  />
);
