export function extractIp(
  regexPattern: string,
  input: string,
): (string | undefined)[] {
  // Replace <IP> with the actual regex for matching IPv4 addresses
  const ipRegex = "(\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)";
  const finalRegexPattern = regexPattern.replace("<IP>", ipRegex);

  // Create a regular expression object from the pattern
  const regex = new RegExp(finalRegexPattern);

  // Find the match
  const match = input.match(regex);

  if (!match) {
    return undefined;
  }

  // Use the match index to extract different parts of the string
  const matchStartIndex = match.index ?? 0;
  const matchEndIndex = matchStartIndex + match[0].length;

  // Before match: the part of the input string before the match
  const beforeMatch = input.slice(0, matchStartIndex);

  // Extracting the IP using the IP part of the regex (group 1)
  const ipMatch = match[0].match(new RegExp(ipRegex))?.[0];

  // The part before the IP and the part after the IP
  const [firstPart, secondPart] = match[0].split(ipMatch || "");

  // After match: the part of the input string after the match
  const afterMatch = input.slice(matchEndIndex);

  return [beforeMatch, firstPart, ipMatch, secondPart, afterMatch];
}
