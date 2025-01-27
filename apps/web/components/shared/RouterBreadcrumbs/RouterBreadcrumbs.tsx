import { Breadcrumbs, Text } from "@mantine/core";
import Link from "next/link";
import classes from "./RouterBreadcrumbs.module.css";

type ItemBreadcrumb = {
  title: string;
  href: string;
  enabled: boolean;
};

type RouterBreadcrumbsProps = {
  path: string;
  displayedPath?: string;
};

const generateBreadcrumbs = (path: string): ItemBreadcrumb[] => {
  return path
    .split("/")
    .filter((item) => item !== "")
    .reduce(
      (prev: ItemBreadcrumb[], curr: string, index) => [
        ...prev,
        {
          title: curr,
          href: prev[prev.length - 1]
            ? `${prev[prev.length - 1].href}/${curr}`
            : `/${curr}`,
          enabled: index !== path.split("/").length - 2,
        },
      ],
      [],
    );
};

export const RouterBreadcrumbs = ({
  path,
  displayedPath,
}: RouterBreadcrumbsProps) => {
  const splitDisplayedPath = displayedPath?.split("/") ?? [];

  const items = generateBreadcrumbs(path).map((item: ItemBreadcrumb, index) =>
    item.enabled ? (
      <Link key={item.title} href={item.href} className={classes.link}>
        <Text fz={"h3"} className={classes.breadcrumb}>
          {displayedPath ? splitDisplayedPath[index + 1] : item.title}
        </Text>
      </Link>
    ) : (
      <Text key={item.title} fz={"h3"} className={classes.breadcrumb}>
        {displayedPath ? splitDisplayedPath[index + 1] : item.title}
      </Text>
    ),
  );

  return <Breadcrumbs>{items}</Breadcrumbs>;
};
