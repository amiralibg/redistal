/**
 * Copy text to clipboard using modern Clipboard API with fallback
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Try modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn("Clipboard API failed, falling back to execCommand:", err);
    }
  }

  // Fallback: execCommand (deprecated but widely supported)
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textArea);
  }
}

/**
 * Format Redis value for clipboard export
 */
export function formatValueForClipboard(
  value: string,
  keyType: string,
  keyName: string
): string {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(value);

    // Return formatted JSON with metadata
    return JSON.stringify(
      {
        key: keyName,
        type: keyType,
        value: parsed,
      },
      null,
      2
    );
  } catch {
    // Not JSON, return as string with metadata
    return JSON.stringify(
      {
        key: keyName,
        type: keyType,
        value: value,
      },
      null,
      2
    );
  }
}
