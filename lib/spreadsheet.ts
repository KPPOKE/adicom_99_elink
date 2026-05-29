export function safeSpreadsheetValue(value: unknown) {
  const text = String(value ?? "");
  return /^[\s\u200B]*[=+\-@]/.test(text) ? `'${text}` : text;
}
