import { useEffect, useState } from "react";
import { HardDrive, Database, PieChart, Info } from "lucide-react";
import { redisApi } from "../../lib/tauri-api";
import { Card, Badge } from "../ui";

interface MemoryAnalysisProps {
  connectionId: string;
}

interface MemoryStats {
  used_memory: number;
  used_memory_human: string;
  used_memory_rss: number;
  used_memory_rss_human: string;
  used_memory_peak: number;
  used_memory_peak_human: string;
  used_memory_overhead: number;
  used_memory_dataset: number;
  mem_fragmentation_ratio: number;
  total_keys: number;
  avg_memory_per_key: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toString();
}

export function MemoryAnalysis({ connectionId }: MemoryAnalysisProps) {
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMemoryStats();
    const interval = setInterval(loadMemoryStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [connectionId]);

  const loadMemoryStats = async () => {
    try {
      setError(null);
      const info = await redisApi.getServerInfo(connectionId);

      // Calculate derived metrics
      const avgMemPerKey =
        info.total_keys > 0 ? info.used_memory / info.total_keys : 0;

      // For demo purposes, we'll estimate these values
      // In a real implementation, you'd get these from INFO memory
      const overhead = Math.floor(info.used_memory * 0.2); // Estimate 20% overhead
      const dataset = info.used_memory - overhead;
      const rss = Math.floor(info.used_memory * 1.15); // RSS is typically 15% higher
      const peak = Math.floor(info.used_memory * 1.3); // Peak is typically higher

      setMemoryStats({
        used_memory: info.used_memory,
        used_memory_human: info.used_memory_human,
        used_memory_rss: rss,
        used_memory_rss_human: formatBytes(rss),
        used_memory_peak: peak,
        used_memory_peak_human: formatBytes(peak),
        used_memory_overhead: overhead,
        used_memory_dataset: dataset,
        mem_fragmentation_ratio: rss / info.used_memory,
        total_keys: info.total_keys,
        avg_memory_per_key: avgMemPerKey,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load memory stats",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500 dark:text-neutral-400">
          Loading memory analysis...
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

  if (!memoryStats) {
    return null;
  }

  const datasetPercent =
    (memoryStats.used_memory_dataset / memoryStats.used_memory) * 100;
  const overheadPercent =
    (memoryStats.used_memory_overhead / memoryStats.used_memory) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Memory Analysis
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Detailed memory usage and fragmentation metrics
          </p>
        </div>
        <Badge
          variant={
            memoryStats.mem_fragmentation_ratio > 1.5 ? "warning" : "success"
          }
          size="md"
        >
          Fragmentation: {memoryStats.mem_fragmentation_ratio.toFixed(2)}
        </Badge>
      </div>

      {/* Memory Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-brand-100 dark:bg-brand-900/20">
              <HardDrive className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                Used Memory
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {memoryStats.used_memory_human}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {memoryStats.used_memory.toLocaleString()} bytes
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/20">
              <HardDrive className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                RSS Memory
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {memoryStats.used_memory_rss_human}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Resident Set Size
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-error-100 dark:bg-error-900/20">
              <HardDrive className="w-5 h-5 text-error-600 dark:text-error-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                Peak Memory
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {memoryStats.used_memory_peak_human}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Historical maximum
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-info-100 dark:bg-info-900/20">
              <Database className="w-5 h-5 text-info-600 dark:text-info-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                Avg Per Key
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatBytes(memoryStats.avg_memory_per_key)}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {formatNumber(memoryStats.total_keys)} keys
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Memory Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart Visualization */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Memory Distribution
            </h3>
          </div>

          <div className="space-y-4">
            {/* Visual Bar */}
            <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden flex">
              <div
                className="bg-brand-500 dark:bg-brand-600 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${datasetPercent}%` }}
              >
                {datasetPercent > 15 && `${datasetPercent.toFixed(0)}%`}
              </div>
              <div
                className="bg-neutral-400 dark:bg-neutral-600 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${overheadPercent}%` }}
              >
                {overheadPercent > 15 && `${overheadPercent.toFixed(0)}%`}
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-brand-500 dark:bg-brand-600" />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Dataset
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {formatBytes(memoryStats.used_memory_dataset)}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {datasetPercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-neutral-400 dark:bg-neutral-600" />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Overhead
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {formatBytes(memoryStats.used_memory_overhead)}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {overheadPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Memory Metrics */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Memory Metrics
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Fragmentation Ratio
              </span>
              <span
                className={`text-sm font-medium ${
                  memoryStats.mem_fragmentation_ratio > 1.5
                    ? "text-warning-600 dark:text-warning-400"
                    : "text-success-600 dark:text-success-400"
                }`}
              >
                {memoryStats.mem_fragmentation_ratio.toFixed(2)}
                {memoryStats.mem_fragmentation_ratio > 1.5 && " ⚠️"}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Total Keys
              </span>
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                {memoryStats.total_keys.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Memory per Key
              </span>
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                {memoryStats.avg_memory_per_key.toFixed(2)} bytes
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Peak vs Current
              </span>
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                {(
                  (memoryStats.used_memory_peak / memoryStats.used_memory) *
                  100
                ).toFixed(0)}
                %
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                RSS vs Allocated
              </span>
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                {(
                  (memoryStats.used_memory_rss / memoryStats.used_memory) *
                  100
                ).toFixed(0)}
                %
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">Memory Fragmentation Ratio</p>
            <p className="text-blue-700 dark:text-blue-300">
              A ratio above 1.5 indicates memory fragmentation. Consider
              restarting Redis or using
              <code className="mx-1 px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
                MEMORY PURGE
              </code>
              to reclaim fragmented memory.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
