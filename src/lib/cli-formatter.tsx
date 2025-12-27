import React from "react";

// Parse RESP (REdis Serialization Protocol) responses and format them nicely
export function formatRedisResponse(rawResponse: string): React.ReactNode {
  // Try to detect the response type and format accordingly

  // Handle simple strings (OK, PONG, etc.)
  if (rawResponse === "OK" || rawResponse === "PONG") {
    return <span className="text-success-light dark:text-success-dark font-semibold">{rawResponse}</span>;
  }

  // Handle nil/null responses
  if (rawResponse === "(nil)" || rawResponse === "Nil") {
    return <span className="text-neutral-500 dark:text-neutral-600 italic">(nil)</span>;
  }

  // Handle integers
  if (rawResponse.match(/^\(integer\) -?\d+$/)) {
    const num = rawResponse.replace("(integer) ", "");
    return (
      <div>
        <span className="text-info-light dark:text-info-dark">(integer)</span>{" "}
        <span className="text-neutral-700 dark:text-neutral-300 font-mono">{num}</span>
      </div>
    );
  }

  // Handle bulk strings (quoted strings)
  if (rawResponse.startsWith('"') && rawResponse.endsWith('"')) {
    return <span className="text-neutral-700 dark:text-neutral-300">{rawResponse}</span>;
  }

  // Try to parse as JSON array (for list responses)
  try {
    const parsed = JSON.parse(rawResponse);

    if (Array.isArray(parsed)) {
      // Check if it's a hash-like structure (alternating key-value pairs)
      if (parsed.length > 0 && parsed.length % 2 === 0 && typeof parsed[0] === "string") {
        // Could be a hash from HGETALL
        return formatHashTable(parsed);
      }

      // Check if it's an array of [member, score] pairs (zset)
      if (parsed.length > 0 && Array.isArray(parsed[0]) && parsed[0].length === 2) {
        return formatZSetTable(parsed as [string, number][]);
      }

      // Regular array/list
      return formatArrayList(parsed);
    }

    // Object (hash)
    if (typeof parsed === "object" && parsed !== null) {
      return formatHashObject(parsed);
    }
  } catch (e) {
    // Not JSON, continue with other formats
  }

  // Handle debug output format (Value at:0x...)
  if (rawResponse.startsWith("Value at:")) {
    return <pre className="text-xs text-neutral-600 dark:text-neutral-400 overflow-x-auto">{rawResponse}</pre>;
  }

  // Default: just return the raw response with basic formatting
  return <pre className="whitespace-pre-wrap break-words">{rawResponse}</pre>;
}

function formatHashTable(pairs: string[]): React.ReactNode {
  const rows: [string, string][] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    rows.push([pairs[i], pairs[i + 1]]);
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-neutral-300 dark:border-neutral-700 rounded text-xs">
        <thead className="bg-neutral-100 dark:bg-neutral-800">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-300 dark:border-neutral-700">
              Field
            </th>
            <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-300 dark:border-neutral-700">
              Value
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {rows.map(([field, value], idx) => (
            <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td className="px-3 py-2 font-mono text-neutral-700 dark:text-neutral-300 break-all">
                {field}
              </td>
              <td className="px-3 py-2 font-mono text-neutral-600 dark:text-neutral-400 break-all">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-neutral-500 dark:text-neutral-600 mt-2">
        {rows.length} {rows.length === 1 ? "field" : "fields"}
      </div>
    </div>
  );
}

function formatHashObject(obj: Record<string, any>): React.ReactNode {
  const entries = Object.entries(obj);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-neutral-300 dark:border-neutral-700 rounded text-xs">
        <thead className="bg-neutral-100 dark:bg-neutral-800">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-300 dark:border-neutral-700">
              Field
            </th>
            <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-300 dark:border-neutral-700">
              Value
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {entries.map(([field, value], idx) => (
            <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td className="px-3 py-2 font-mono text-neutral-700 dark:text-neutral-300 break-all">
                {field}
              </td>
              <td className="px-3 py-2 font-mono text-neutral-600 dark:text-neutral-400 break-all">
                {typeof value === "string" ? value : JSON.stringify(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-neutral-500 dark:text-neutral-600 mt-2">
        {entries.length} {entries.length === 1 ? "field" : "fields"}
      </div>
    </div>
  );
}

function formatZSetTable(items: [string, number][]): React.ReactNode {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-neutral-300 dark:border-neutral-700 rounded text-xs">
        <thead className="bg-neutral-100 dark:bg-neutral-800">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-300 dark:border-neutral-700 w-16">
              #
            </th>
            <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-300 dark:border-neutral-700">
              Member
            </th>
            <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-300 dark:border-neutral-700 w-24">
              Score
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {items.map(([member, score], idx) => (
            <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td className="px-3 py-2 text-neutral-500 dark:text-neutral-600">
                {idx + 1}
              </td>
              <td className="px-3 py-2 font-mono text-neutral-700 dark:text-neutral-300 break-all">
                {member}
              </td>
              <td className="px-3 py-2 font-mono text-neutral-600 dark:text-neutral-400">
                {score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-neutral-500 dark:text-neutral-600 mt-2">
        {items.length} {items.length === 1 ? "member" : "members"}
      </div>
    </div>
  );
}

function formatArrayList(items: any[]): React.ReactNode {
  if (items.length === 0) {
    return <span className="text-neutral-500 dark:text-neutral-600 italic">(empty array)</span>;
  }

  // Check if it's a simple list of strings
  const isSimpleList = items.every((item) => typeof item === "string");

  if (isSimpleList) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border border-neutral-300 dark:border-neutral-700 rounded text-xs">
          <thead className="bg-neutral-100 dark:bg-neutral-800">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-300 dark:border-neutral-700 w-16">
                Index
              </th>
              <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 border-b border-neutral-300 dark:border-neutral-700">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <td className="px-3 py-2 text-neutral-500 dark:text-neutral-600">
                  {idx}
                </td>
                <td className="px-3 py-2 font-mono text-neutral-700 dark:text-neutral-300 break-all">
                  {item}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-xs text-neutral-500 dark:text-neutral-600 mt-2">
          {items.length} {items.length === 1 ? "item" : "items"}
        </div>
      </div>
    );
  }

  // Complex array, show as JSON
  return <pre className="text-xs overflow-x-auto">{JSON.stringify(items, null, 2)}</pre>;
}

// Highlight Redis commands in input
export function highlightCommand(command: string): React.ReactNode {
  const parts = command.trim().split(/\s+/);
  if (parts.length === 0) return command;

  const cmdName = parts[0].toUpperCase();
  const args = parts.slice(1);

  return (
    <>
      <span className="text-brand-600 dark:text-brand-400 font-semibold">{cmdName}</span>
      {args.length > 0 && " "}
      {args.map((arg, idx) => (
        <span key={idx} className="text-neutral-700 dark:text-neutral-300">
          {arg}
          {idx < args.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
