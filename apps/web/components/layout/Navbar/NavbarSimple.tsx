"use client";

import { Code, Group, Text } from "@mantine/core";
import {
  IconBook,
  IconSettings2,
  IconSquareDot,
  IconSquareRotatedOff,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import classes from "./NavbarSimple.module.css";

const data = [
  { link: "/configs", label: "configs", icon: IconSettings2 },
  { link: "/matches", label: "matches", icon: IconSquareDot },
  { link: "/bans", label: "bans", icon: IconSquareRotatedOff },
];

export function NavbarSimple() {
  const pathname = usePathname();
  const menu = pathname.split("/")?.[1];

  const links = data.map((item) => (
    <Link
      className={classes.link}
      data-active={item.label === menu || undefined}
      href={item.link}
      key={item.label}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          <Text color="yellow" size="xl">
            Banalize
          </Text>
          <Code fw={700}>v3.1.2</Code>
        </Group>
        {links}
      </div>

      <div className={classes.footer}>
        <a href="#" className={classes.link}>
          <IconBook className={classes.linkIcon} stroke={1.5} />
          <span>Documentation</span>
        </a>
      </div>
    </nav>
  );
}
