export type ExtractedIP = {
  match: {
    before: string;
    ip: string | null;
    after: string;
  };
  context: {
    beforeMatch: string;
    afterMatch: string;
  };
};

export function extractIp(
  regexPattern: string,
  input: string,
): ExtractedIP | undefined {
  // Regular expression to match IPv4 addresses
  const ipRegex = "(\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)";
  const finalRegexPattern = regexPattern.replace("<IP>", ipRegex);

  const regex = new RegExp(finalRegexPattern);
  const match = input.match(regex);

  if (!match) {
    return undefined;
  }

  // Extract match information
  const matchStartIndex = match.index ?? 0;
  const matchEndIndex = matchStartIndex + match[0].length;

  const beforeMatch = input.slice(0, matchStartIndex);
  const ipMatch = match[0].match(new RegExp(ipRegex))?.[0] ?? null;
  const [firstPart, secondPart] = ipMatch ? match[0].split(ipMatch) : ["", ""];
  const afterMatch = input.slice(matchEndIndex);

  return {
    match: {
      before: firstPart,
      ip: ipMatch,
      after: secondPart,
    },
    context: {
      beforeMatch,
      afterMatch,
    },
  };
}
