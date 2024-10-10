import {
  DefaultMantineColor,
  Group,
  rem,
  Text,
  TextProps,
  ThemeIcon,
} from "@mantine/core";
import React from "react";

type IconTextProps = {
  text: string;
  icon: React.ReactNode;
  color?: DefaultMantineColor;
  textProps?: TextProps;
};

export const IconText = ({
  text,
  icon,
  color = "dark",
  textProps,
}: IconTextProps) => {
  return (
    <Group gap="xs">
      <ThemeIcon color={color} size={rem(25)}>
        {icon}
      </ThemeIcon>
      <Text ml="xs" fz="sm" {...textProps}>
        {text}
      </Text>
    </Group>
  );
};
