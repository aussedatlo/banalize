import cx from "clsx";
import classes from "./TimelineBullet.module.css";

type TimelineBulletProps = {
  color?: "red.6" | "orange.6";
  lineWidth?: "md" | "lg";
  bulletSize?: "xl" | "lg";
};

export function TimelineBullet({
  bulletSize = "lg",
  lineWidth = "md",
  color = "red.6",
}: TimelineBulletProps) {
  const dynamicColor = `var(--mantine-color-${color.replace(".", "-")})`;
  const bulletClass = cx(
    classes.bullet,
    classes[`bulletSize-${bulletSize}`],
    classes[`lineWidth-${lineWidth}`],
  );

  return (
    <div style={{ borderColor: dynamicColor }} className={bulletClass}></div>
  );
}
