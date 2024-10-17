import {
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Group,
  MultiSelect as MantineMultiSelect,
  MultiSelectProps,
  rem,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import classes from "./MultiSelect.module.css";

type MultiSelectCustomProps = MultiSelectProps & {
  withPills?: boolean;
};

export const MultiSelect = ({
  renderOption,
  withPills = false,
  ...props
}: MultiSelectCustomProps) => {
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
    <MantineMultiSelect
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
