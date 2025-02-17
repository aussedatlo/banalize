import { ActionIcon, Menu as MenuMantine, rem, ThemeIcon } from "@mantine/core";
import { IconDotsVertical } from "@tabler/icons-react";
import styles from "./Menu.module.css";

export type Props = {
  items: { text: string; icon: JSX.Element; onClick: () => void }[];
};

export const Menu = ({ items }: Props) => {
  return (
    <MenuMantine>
      <MenuMantine.Target>
        <ActionIcon className={styles.menuIcon}>
          <IconDotsVertical style={{ width: rem(18), height: rem(18) }} />
        </ActionIcon>
      </MenuMantine.Target>

      <MenuMantine.Dropdown>
        {items.map(({ text, icon, onClick }, index) => (
          <MenuMantine.Item
            key={index}
            onClick={onClick}
            leftSection={
              <ThemeIcon color="dark" size={rem(22)}>
                {icon}
              </ThemeIcon>
            }
            className={styles.input}
          >
            {text}
          </MenuMantine.Item>
        ))}
      </MenuMantine.Dropdown>
    </MenuMantine>
  );
};
