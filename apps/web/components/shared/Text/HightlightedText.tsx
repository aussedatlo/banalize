import { extractIp } from "@banalize/shared-utils";
import { Box, rgba, Text, useMantineTheme } from "@mantine/core";

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
      <Text component="span">{result.context.beforeMatch}</Text>
      <Text component="span" bg={rgba(theme.colors.cyan[6], 0.2)}>
        {result.match.before}
      </Text>
      <Text component="span" bg="cyan">
        {result.match.ip}
      </Text>
      <Text component="span" bg={rgba(theme.colors.cyan[6], 0.2)}>
        {result.match.after}
      </Text>
      <Text component="span">{result.context.afterMatch}</Text>
    </Box>
  );
};
