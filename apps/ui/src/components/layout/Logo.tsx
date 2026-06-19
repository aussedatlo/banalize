import logoMarkup from "@/assets/logo.svg?raw";
import { cn } from "@/lib/utils";
import { useId } from "react";

interface LogoProps {
  /** Sizing classes for the logo wrapper, e.g. "h-12 w-12". */
  className?: string;
}

/**
 * Inlines the brand shield mark. The shield keeps its own blue→purple gradient
 * and the speed lines stay fixed blue; the intruder face follows `currentColor`
 * so it renders dark navy in the light theme and white in the dark theme,
 * staying visible against either background.
 */
export default function Logo({ className }: LogoProps) {
  // The logo is inlined in several places (sidebar + mobile drawer). Make the
  // gradient id unique per instance so duplicate ids don't collide — otherwise
  // an instance's `url(#…)` can resolve to a gradient in a `display:none`
  // subtree and the shield renders without its gradient.
  const gradientId = `shield-gradient-${useId().replace(/:/g, "")}`;
  const markup = logoMarkup.replace(/shieldGradient/g, gradientId);

  return (
    <span
      role="img"
      aria-label="Banalize"
      className={cn(
        "block text-[#0d143a] dark:text-white [&>svg]:h-full [&>svg]:w-full",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
