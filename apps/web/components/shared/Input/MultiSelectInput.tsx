import {
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Group,
  MultiSelect,
  MultiSelectProps,
  rem,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import classes from "./MultiSelectInput.module.css";

type MultiSelectInputProps = MultiSelectProps & {
  withPills?: boolean;
};

export const MultiSelectInput = ({
  renderOption,
  withPills = false,
  ...props
}: MultiSelectInputProps) => {
  const render = (item: ComboboxLikeRenderOptionInput<ComboboxItem>) => (
    <Group justify="space-between" w="100%">
      <Group>{renderOption && renderOption(item)}</Group>

      {item.checked && (
        <IconCheck
          style={{
            width: rem(16),
            height: rem(16),
          }}
        />
      )}
    </Group>
  );

  return (
    <MultiSelect
      classNames={{
        pill: !withPills ? classes.pill : "",
        input: classes.input,
        option: classes.option,
      }}
      renderOption={render}
      {...props}
    />
  );
};
