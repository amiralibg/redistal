import { useState, useRef, useEffect } from "react";
import { Terminal, Send, Trash2, Database } from "lucide-react";
import { useRedisStore } from "../store/useRedisStore";
import { redisApi } from "../lib/tauri-api";
import { useToast } from "../lib/toast-context";
import { IconButton, Badge, ConfirmDialog } from "./ui";
import clsx from "clsx";

interface CommandHistory {
  command: string;
  result: string;
  timestamp: Date;
  error?: boolean;
}

const DANGEROUS_COMMANDS = [
  "FLUSHDB",
  "FLUSHALL",
  "SHUTDOWN",
  "CONFIG",
  "SAVE",
  "BGSAVE",
];

export function CliPanel() {
  const { activeConnectionId } = useRedisStore();
  const toast = useToast();
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);
  const [pendingCommand, setPendingCommand] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const executeCommand = async (cmd: string) => {
    if (!activeConnectionId) return;

    try {
      const result = await redisApi.executeCommand(activeConnectionId, cmd);
      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          result,
          timestamp: new Date(),
          error: false,
        },
      ]);
      toast.success(
        "Command executed",
        `Successfully executed: ${cmd.split(" ")[0]}`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          result: errorMsg,
          timestamp: new Date(),
          error: true,
        },
      ]);
      toast.error("Command failed", errorMsg);
    }
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !activeConnectionId) return;

    const cmd = command.trim();
    const cmdUpper = cmd.toUpperCase();
    const firstWord = cmdUpper.split(" ")[0];

    // Check if it's a dangerous command
    if (DANGEROUS_COMMANDS.includes(firstWord)) {
      setPendingCommand(cmd);
      setShowDangerConfirm(true);
      setCommand("");
      return;
    }

    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setCommand("");
    await executeCommand(cmd);
  };

  const confirmDangerousCommand = async () => {
    setCommandHistory((prev) => [...prev, pendingCommand]);
    setHistoryIndex(-1);
    await executeCommand(pendingCommand);
    setShowDangerConfirm(false);
    setPendingCommand("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand("");
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const handleClear = () => {
    setHistory([]);
  };

  if (!activeConnectionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-neutral-950 text-center">
        <Database className="w-16 h-16 text-neutral-800 mb-4" />
        <h3 className="text-sm font-semibold text-neutral-400 mb-1">
          No Connection
        </h3>
        <p className="text-xs text-neutral-600">
          Connect to Redis to use the CLI
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-success-dark" />
          <h3 className="text-sm font-semibold text-neutral-200">Redis CLI</h3>
          <Badge variant="default" size="sm">
            {history.length} {history.length === 1 ? "command" : "commands"}
          </Badge>
        </div>
        <IconButton
          onClick={handleClear}
          variant="ghost"
          size="sm"
          title="Clear history"
          className="text-neutral-400 hover:text-neutral-200"
        >
          <Trash2 className="w-4 h-4" />
        </IconButton>
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Terminal className="w-12 h-12 text-neutral-800 mb-3" />
            <p className="text-neutral-500 text-xs max-w-xs">
              Type Redis commands here. Use{" "}
              <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-xs">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-xs">
                ↓
              </kbd>{" "}
              to navigate command history.
            </p>
          </div>
        ) : (
          history.map((entry, index) => (
            <div
              key={index}
              className="space-y-2 pb-3 border-b border-neutral-900 last:border-0"
            >
              {/* Command */}
              <div className="flex items-start gap-2">
                <span className="text-success-dark select-none">{">"}</span>
                <span className="text-blue-400 flex-1 break-all">
                  {entry.command}
                </span>
                <span className="text-xs text-neutral-600 flex-shrink-0">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {/* Result */}
              <div
                className={clsx("pl-4 break-all whitespace-pre-wrap", {
                  "text-success-dark": !entry.error,
                  "text-error-dark": entry.error,
                })}
              >
                {entry.result}
              </div>
            </div>
          ))
        )}
        <div ref={historyEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleExecute}
        className="p-4 border-t border-neutral-800 bg-neutral-900"
      >
        <div className="flex items-center gap-3">
          <span className="text-success-dark font-mono select-none">{">"}</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter Redis command (e.g., GET mykey)"
            className="flex-1 bg-transparent border-none outline-none text-neutral-100 placeholder-neutral-600 font-mono text-sm focus:ring-0"
            autoFocus
          />
          <button
            type="submit"
            disabled={!command.trim()}
            className={clsx(
              "p-2 rounded-lg transition-all duration-200",
              command.trim()
                ? "bg-success-dark/20 text-success-dark hover:bg-success-dark/30"
                : "text-neutral-700 cursor-not-allowed",
            )}
            title="Execute command"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Dangerous Command Confirmation */}
      <ConfirmDialog
        isOpen={showDangerConfirm}
        onClose={() => {
          setShowDangerConfirm(false);
          setPendingCommand("");
        }}
        onConfirm={confirmDangerousCommand}
        title="Dangerous Command"
        message={
          <div>
            <p className="mb-2">
              You are about to execute a potentially dangerous command:
            </p>
            <p className="font-mono text-sm text-neutral-100 bg-neutral-800 px-3 py-2 rounded mb-2">
              {pendingCommand}
            </p>
            <p className="text-xs text-warning-light dark:text-warning-dark">
              This operation may affect your database or server. Are you sure
              you want to continue?
            </p>
          </div>
        }
        confirmText="Execute Anyway"
        variant="warning"
      />
    </div>
  );
}
