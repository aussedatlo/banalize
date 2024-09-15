import { Breadcrumbs, Text } from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/router";
import classes from "./RouterBreadcrumbs.module.css";

type ItemBreadcrumb = {
  title: string;
  href: string;
  enabled: boolean;
};

export const RouterBreadcrumbs = () => {
  const router = useRouter();
  const items = router.asPath
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
          enabled: index !== router.asPath.split("/").length - 2,
        },
      ],
      [],
    )
    .map((item: ItemBreadcrumb) =>
      item.enabled ? (
        <Link key={item.title} href={item.href} className={classes.link}>
          <Text fz={"h3"} className={classes.breadcrumb}>
            {item.title}
          </Text>
        </Link>
      ) : (
        <Text key={item.title} fz={"h3"} className={classes.breadcrumb}>
          {item.title}
        </Text>
      ),
    );
  return <Breadcrumbs style={{ height: 40 }}>{items}</Breadcrumbs>;
};
