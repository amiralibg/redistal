import { getCommand } from "./redis-commands";

export interface ContextSuggestion {
  value: string;
  description?: string;
  type: "key" | "field" | "member" | "index" | "value";
}

interface SuggestionContext {
  keys: string[];
  selectedKey?: string;
  selectedKeyType?: string;
  hashFields?: string[];
  setMembers?: string[];
  listLength?: number;
  zsetMembers?: string[];
}

/**
 * Get context-aware suggestions based on what the user is typing
 */
export function getContextSuggestions(
  input: string,
  context: SuggestionContext,
): ContextSuggestion[] {
  const parts = input.trim().split(/\s+/);

  if (parts.length === 0) return [];

  const commandName = parts[0].toUpperCase();
  const command = getCommand(commandName);

  if (!command || !command.args) return [];

  // Figure out which argument position we're at
  const argPosition = parts.length - 1; // 0-based (command is parts[0])

  if (argPosition === 0 || argPosition > command.args.length) {
    return [];
  }

  const currentArg = command.args[argPosition - 1];
  if (!currentArg) return [];

  const partialValue = parts[argPosition] || "";

  return getSuggestionsForArgType(currentArg.type, partialValue, context);
}

function getSuggestionsForArgType(
  argType: string,
  partialValue: string,
  context: SuggestionContext,
): ContextSuggestion[] {
  const suggestions: ContextSuggestion[] = [];

  switch (argType) {
    case "key":
      // Suggest all available keys
      return context.keys
        .filter((key) =>
          key.toLowerCase().startsWith(partialValue.toLowerCase()),
        )
        .slice(0, 20) // Limit to 20 suggestions
        .map((key) => ({
          value: key,
          type: "key",
        }));

    case "field":
      // Suggest hash fields if we have a hash selected
      if (context.selectedKeyType === "hash" && context.hashFields) {
        return context.hashFields
          .filter((field) =>
            field.toLowerCase().startsWith(partialValue.toLowerCase()),
          )
          .slice(0, 20)
          .map((field) => ({
            value: field,
            description: "field",
            type: "field",
          }));
      }
      break;

    case "member":
      // Suggest set/zset members
      if (context.selectedKeyType === "set" && context.setMembers) {
        return context.setMembers
          .filter((member) =>
            member.toLowerCase().startsWith(partialValue.toLowerCase()),
          )
          .slice(0, 20)
          .map((member) => ({
            value: member,
            description: "member",
            type: "member",
          }));
      } else if (context.selectedKeyType === "zset" && context.zsetMembers) {
        return context.zsetMembers
          .filter((member) =>
            member.toLowerCase().startsWith(partialValue.toLowerCase()),
          )
          .slice(0, 20)
          .map((member) => ({
            value: member,
            description: "member",
            type: "member",
          }));
      }
      break;

    case "index":
      // Suggest valid indices for lists
      if (
        context.selectedKeyType === "list" &&
        context.listLength !== undefined
      ) {
        const indices: ContextSuggestion[] = [];
        const length = context.listLength;

        // Suggest common indices
        if (length > 0) {
          indices.push(
            { value: "0", description: "first element", type: "index" },
            { value: "-1", description: "last element", type: "index" },
          );

          if (length > 1) {
            indices.push({
              value: String(length - 1),
              description: "last index",
              type: "index",
            });
          }

          if (length > 2) {
            indices.push({
              value: String(Math.floor(length / 2)),
              description: "middle",
              type: "index",
            });
          }
        }

        return indices.filter((idx) => idx.value.startsWith(partialValue));
      }
      break;
  }

  return suggestions;
}

/**
 * Format a suggestion for display in the dropdown
 */
export function formatSuggestion(suggestion: ContextSuggestion): string {
  if (suggestion.description) {
    return `${suggestion.value} (${suggestion.description})`;
  }
  return suggestion.value;
}

/**
 * Check if we should show context suggestions for the current input
 */
export function shouldShowContextSuggestions(input: string): boolean {
  const parts = input.trim().split(/\s+/);

  // Only show context suggestions if we have a command and at least started typing an argument
  return parts.length >= 2;
}
