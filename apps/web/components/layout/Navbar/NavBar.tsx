"use client";

import { AppShell, Burger, Code, Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBellFilled, IconShieldLockFilled } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import classes from "./NavBar.module.css";

const data = [
  { link: "/configs", label: "configs", icon: IconShieldLockFilled },
  { link: "/notifications", label: "notifications", icon: IconBellFilled },
];

export const NavBar = ({ children }: PropsWithChildren) => {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();
  const menu = pathname.split("/")?.[1];

  const links = data.map((item) => (
    <Link
      className={classes.link}
      data-active={item.label === menu || undefined}
      href={item.link}
      key={item.label}
      onClick={toggle}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
      style={{
        display: "flex",
        width: "100%",
      }}
    >
      <AppShell.Header className={classes.header}>
        <Burger
          opened={opened}
          onClick={toggle}
          hiddenFrom="sm"
          size="sm"
          mr="lg"
        />
        <Group>
          <Text color="cyan" size="xl">
            Banalize
          </Text>
          <Code fw={700}>v{process.env.NEXT_PUBLIC_BANALIZE_WEB_VERSION}</Code>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">{links}</AppShell.Navbar>

      <AppShell.Main style={{ width: "100%" }}>{children}</AppShell.Main>
    </AppShell>
  );
};
