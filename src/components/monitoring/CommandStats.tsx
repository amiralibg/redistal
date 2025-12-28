import { useEffect, useState } from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
import { redisApi } from "../../lib/tauri-api";
import { CommandStat } from "../../types/redis";
import { Card } from "../ui";

interface CommandStatsProps {
  connectionId: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toString();
}

export function CommandStats({ connectionId }: CommandStatsProps) {
  const [stats, setStats] = useState<CommandStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCommandStats();
    const interval = setInterval(loadCommandStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [connectionId]);

  const loadCommandStats = async () => {
    try {
      setError(null);
      const commandStats = await redisApi.getCommandStats(connectionId);
      setStats(commandStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load command stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500 dark:text-neutral-400">
          Loading command statistics...
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

  const totalCalls = stats.reduce((sum, stat) => sum + stat.calls, 0);
  const totalTime = stats.reduce((sum, stat) => sum + stat.usec, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Command Statistics
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Performance metrics for Redis commands
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
          <BarChart3 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {stats.length} Command{stats.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-brand-100 dark:bg-brand-900/20">
              <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Calls</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatNumber(totalCalls)}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {totalCalls.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/20">
              <BarChart3 className="w-5 h-5 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Time</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {(totalTime / 1000000).toFixed(2)}s
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {totalTime.toLocaleString()} μs
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-info-100 dark:bg-info-900/20">
              <TrendingUp className="w-5 h-5 text-info-600 dark:text-info-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Avg Time/Call</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {totalCalls > 0 ? (totalTime / totalCalls).toFixed(2) : "0"} μs
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                microseconds
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Command
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Calls
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Total Time (μs)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Avg Time (μs)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Usage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {stats.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400"
                  >
                    No command statistics available
                  </td>
                </tr>
              ) : (
                stats.map((stat) => {
                  const usagePercent = totalCalls > 0 ? (stat.calls / totalCalls) * 100 : 0;
                  return (
                    <tr
                      key={stat.name}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <code className="text-sm font-mono font-semibold text-brand-600 dark:text-brand-400">
                          {stat.name.toUpperCase()}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {stat.calls.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {stat.usec.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {stat.usec_per_call.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 dark:bg-brand-600 rounded-full transition-all"
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-600 dark:text-neutral-400 w-12 text-right">
                            {usagePercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
