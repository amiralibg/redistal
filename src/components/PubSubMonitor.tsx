import { useState, useEffect } from "react";
import { Radio, Users, Hash } from "lucide-react";
import { redisApi } from "../lib/tauri-api";
import { Card } from "./ui";
import type { PubSubStats } from "../types/redis";

interface PubSubMonitorProps {
  connectionId: string;
}

export function PubSubMonitor({ connectionId }: PubSubMonitorProps) {
  const [stats, setStats] = useState<PubSubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setError(null);
      const data = await redisApi.getPubSubStats(connectionId);
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load Pub/Sub stats",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 3000); // 3s refresh
    return () => clearInterval(interval);
  }, [connectionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-600 dark:text-neutral-400">
        Loading Pub/Sub stats...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-error-600 dark:text-error-400">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const totalChannels = stats.channels.length;
  const totalSubscribers = stats.channels.reduce(
    (sum, ch) => sum + ch.subscribers,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-lg">
              <Hash className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {totalChannels}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Active Channels
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info-500/10 rounded-lg">
              <Users className="w-5 h-5 text-info-600 dark:text-info-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {totalSubscribers}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Total Subscribers
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-500/10 rounded-lg">
              <Radio className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {stats.pattern_subscribers}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Pattern Subscribers
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Channel List Table */}
      <Card>
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Channels
          </h3>
        </div>
        <div className="overflow-auto max-h-96">
          {totalChannels === 0 ? (
            <div className="p-8 text-center text-neutral-600 dark:text-neutral-400">
              No active channels
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-900 sticky top-0">
                <tr className="text-left text-xs text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="p-3 font-medium">Channel Name</th>
                  <th className="p-3 font-medium text-right">Subscribers</th>
                </tr>
              </thead>
              <tbody>
                {stats.channels.map((channel, index) => (
                  <tr
                    key={index}
                    className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                  >
                    <td className="p-3 font-mono text-sm text-neutral-900 dark:text-neutral-200">
                      {channel.name}
                    </td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-1 bg-info-500/10 text-info-600 dark:text-info-400 rounded text-sm">
                        {channel.subscribers}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
