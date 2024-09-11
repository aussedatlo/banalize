import { Code, Group, Text } from "@mantine/core";
import {
  IconBook,
  IconSettings2,
  IconSquareDot,
  IconSquareRotatedOff,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import classes from "./NavbarSimple.module.css";

const data = [
  { link: "configs", label: "configs", icon: IconSettings2 },
  { link: "matches", label: "matches", icon: IconSquareDot },
  { link: "bans", label: "bans", icon: IconSquareRotatedOff },
];

export function NavbarSimple() {
  const router = useRouter();
  console.log(router.pathname.replace("/", ""));
  const [active, setActive] = useState("configs");

  const links = data.map((item) => (
    <Link
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={() => {
        setActive(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          <Text
            variant="gradient"
            gradient={{ from: "pink", to: "yellow" }}
            size="xl"
          >
            Banalize
          </Text>
          <Code fw={700}>v3.1.2</Code>
        </Group>
        {links}
      </div>

      <div className={classes.footer}>
        <a
          href="#"
          className={classes.link}
          onClick={(event) => event.preventDefault()}
        >
          <IconBook className={classes.linkIcon} stroke={1.5} />
          <span>Documentation</span>
        </a>
      </div>
    </nav>
  );
}
