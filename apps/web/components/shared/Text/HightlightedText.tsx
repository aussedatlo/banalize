import { extractIp } from "@banalize/shared-utils";
import { Box, rgba, Text, TextProps, useMantineTheme } from "@mantine/core";
import { PropsWithChildren } from "react";
import classes from "./HighlightedText.module.css";

const SpanText = (props: TextProps & PropsWithChildren) => (
  <Text component="span" {...props} />
);

type HighlightedTextProps = {
  text: string;
  regex: string;
};

export const HighlightedText = ({ text, regex }: HighlightedTextProps) => {
  const theme = useMantineTheme();
  const result = extractIp(regex, text);

  if (!result || !result.match.ip) return <Text component="span">{text}</Text>;

  return (
    <Box display="inline">
      <SpanText>{result.context.beforeMatch}</SpanText>
      <SpanText className={classes.text} bg={rgba(theme.colors.cyan[6], 0.2)}>
        {result.match.before}
        <SpanText className={classes.text} bg="cyan">
          {result.match.ip}
        </SpanText>
        {result.match.after}
      </SpanText>
      <SpanText>{result.context.afterMatch}</SpanText>
    </Box>
  );
};
