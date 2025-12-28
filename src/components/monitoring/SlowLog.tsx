import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { redisApi } from "../../lib/tauri-api";
import { SlowLogEntry } from "../../types/redis";
import { Card, Badge } from "../ui";

interface SlowLogProps {
  connectionId: string;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

function formatDuration(microseconds: number): string {
  if (microseconds < 1000) return `${microseconds}μs`;
  const ms = microseconds / 1000;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  const seconds = ms / 1000;
  return `${seconds.toFixed(2)}s`;
}

function getDurationColor(microseconds: number): string {
  const ms = microseconds / 1000;
  if (ms > 1000) return "text-error-light dark:text-error-dark";
  if (ms > 100) return "text-warning-light dark:text-warning-dark";
  return "text-neutral-700 dark:text-neutral-300";
}

export function SlowLog({ connectionId }: SlowLogProps) {
  const [entries, setEntries] = useState<SlowLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(128);

  useEffect(() => {
    loadSlowLog();
  }, [connectionId, count]);

  const loadSlowLog = async () => {
    try {
      setError(null);
      setLoading(true);
      const log = await redisApi.getSlowLog(connectionId, count);
      setEntries(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slow log");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500 dark:text-neutral-400">
          Loading slow log...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Slow Query Log
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Commands that exceeded the slowlog threshold
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value={32}>Last 32</option>
            <option value={64}>Last 64</option>
            <option value={128}>Last 128</option>
            <option value={256}>Last 256</option>
          </select>
          {entries.length > 0 && (
            <Badge variant="warning" size="md">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {entries.length} Slow {entries.length === 1 ? "Query" : "Queries"}
            </Badge>
          )}
        </div>
      </div>

      {/* Slow Log Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Command
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="w-12 h-12 text-neutral-300 dark:text-neutral-700" />
                      <p className="text-neutral-500 dark:text-neutral-400">
                        No slow queries recorded
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        Queries exceeding the slowlog threshold will appear here
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-neutral-600 dark:text-neutral-400">
                        #{entry.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-semibold ${getDurationColor(entry.duration)}`}
                      >
                        {formatDuration(entry.duration)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded text-neutral-900 dark:text-white">
                        {entry.command.join(" ")}
                      </code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
