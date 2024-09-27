export function extractIp(pattern: string, input: string): string | undefined {
  // Replace the placeholder <IP> with a regex that matches an IP address
  const ipRegex = "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b";
  const modifiedPattern = pattern.replace("<IP>", `(${ipRegex})`);

  // Create a RegExp object from the modified pattern
  try {
    const regex = new RegExp(modifiedPattern);

    // Search for the IP address in the input string
    const match = input.match(regex);

    return match?.[1];
  } catch (e) {
    console.error(e);
    return undefined;
  }
}
