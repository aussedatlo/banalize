"use client";

import {
  BoxProps,
  Group,
  Menu,
  MenuProps,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import classes from "./DropdownInput.module.css";

type MenuIconItem<T> = {
  label: string;
  icon: React.ReactElement;
  value: T;
};

type MenuIconProps<T> = {
  data: MenuIconItem<T>[];
  onValueChange: (value: T) => void;
  initialValue?: T;
} & MenuProps &
  BoxProps;

export const DropdownInput = <T,>({
  data,
  onValueChange,
  initialValue,
  ...props
}: MenuIconProps<T>) => {
  const [opened, setOpened] = useState(false);
  const initialItem = data.find((item) => item.value === initialValue);
  const [selected, setSelected] = useState<MenuIconItem<T>>(
    initialItem ?? data[0],
  );

  const handleSelect = (item: MenuIconItem<T>) => {
    setSelected(item);
    onValueChange(item.value);
  };

  const items = data.map((item) => (
    <Menu.Item
      leftSection={item.icon}
      onClick={() => handleSelect(item)}
      key={item.label}
    >
      {item.label}
    </Menu.Item>
  ));

  return (
    <Menu
      onOpen={() => setOpened(true)}
      onClose={() => setOpened(false)}
      radius="md"
      width="target"
      withinPortal
      {...props}
    >
      <Menu.Target>
        <UnstyledButton
          className={classes.control}
          data-expanded={opened || undefined}
        >
          <Group gap="xs">
            {selected.icon}
            <span className={classes.label}>{selected.label}</span>
          </Group>
          <IconChevronDown size="1rem" className={classes.icon} stroke={1.5} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>{items}</Menu.Dropdown>
    </Menu>
  );
};
