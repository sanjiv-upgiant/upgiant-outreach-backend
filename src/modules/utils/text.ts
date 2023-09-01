export function removeSurroundingQuotes(str: string): string {
  let trimmedStr = str.trim();

  if ((trimmedStr.startsWith('"') && trimmedStr.endsWith('"')) || (trimmedStr.startsWith("'") && trimmedStr.endsWith("'"))) {
    trimmedStr = trimmedStr.substring(1, trimmedStr.length - 1);
  }

  console.log('SUBJECT =>', trimmedStr);
  return trimmedStr;
}
