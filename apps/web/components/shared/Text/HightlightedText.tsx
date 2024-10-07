import { extractIp } from "@banalize/shared-utils";
import { Box, rgba, Text, useMantineTheme } from "@mantine/core";

type HighlightedTextProps = {
  text: string;
  regex: string;
};

export const HighlightedText = ({ text, regex }: HighlightedTextProps) => {
  const theme = useMantineTheme();
  const result = extractIp(regex, text);

  if (!result || result.length !== 5)
    return <Text component="span">{text}</Text>;

  return (
    <Box display="inline">
      <Text component="span">{result[0]}</Text>
      <Text component="span" bg={rgba(theme.colors.cyan[6], 0.2)}>
        {result[1]}
      </Text>
      <Text component="span" bg="cyan">
        {result[2]}
      </Text>
      <Text component="span" bg={rgba(theme.colors.cyan[6], 0.2)}>
        {result[3]}
      </Text>
      <Text component="span">{result[4]}</Text>
    </Box>
  );
};
