import { useEffect, useState } from "react";
import {
  Server,
  Users,
  Database,
  Activity,
  Clock,
  HardDrive,
  TrendingUp,
  Zap,
} from "lucide-react";
import { redisApi } from "../../lib/tauri-api";
import { ServerInfo } from "../../types/redis";
import { Card, Badge } from "../ui";

interface ServerStatsProps {
  connectionId: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: "default" | "success" | "warning" | "info";
}

function StatCard({ icon, label, value, subtitle, variant = "default" }: StatCardProps) {
  const variantColors = {
    default: "text-neutral-600 dark:text-neutral-400",
    success: "text-success-light dark:text-success-dark",
    warning: "text-warning-light dark:text-warning-dark",
    info: "text-info-light dark:text-info-dark",
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${variantColors[variant]} bg-neutral-100 dark:bg-neutral-800`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function ServerStats({ connectionId }: ServerStatsProps) {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServerInfo();
    const interval = setInterval(loadServerInfo, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [connectionId]);

  const loadServerInfo = async () => {
    try {
      setError(null);
      const info = await redisApi.getServerInfo(connectionId);
      setServerInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load server info");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500 dark:text-neutral-400">
          Loading server statistics...
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

  if (!serverInfo) {
    return null;
  }

  const hitRate =
    serverInfo.keyspace_hits + serverInfo.keyspace_misses > 0
      ? (
          (serverInfo.keyspace_hits /
            (serverInfo.keyspace_hits + serverInfo.keyspace_misses)) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* Header with version */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Server Overview
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time server metrics and statistics
          </p>
        </div>
        <Badge variant="default" size="md">
          Redis {serverInfo.version}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Uptime"
          value={formatUptime(serverInfo.uptime_seconds)}
          subtitle={`${serverInfo.uptime_seconds.toLocaleString()} seconds`}
          variant="success"
        />

        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Connected Clients"
          value={serverInfo.connected_clients}
          variant="info"
        />

        <StatCard
          icon={<Database className="w-5 h-5" />}
          label="Total Keys"
          value={formatNumber(serverInfo.total_keys)}
          subtitle={serverInfo.total_keys.toLocaleString()}
        />

        <StatCard
          icon={<HardDrive className="w-5 h-5" />}
          label="Memory Usage"
          value={serverInfo.used_memory_human}
          subtitle={`${serverInfo.used_memory.toLocaleString()} bytes`}
        />

        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Operations/sec"
          value={serverInfo.ops_per_sec.toFixed(0)}
          variant="success"
        />

        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Commands Processed"
          value={formatNumber(serverInfo.total_commands_processed)}
          subtitle={serverInfo.total_commands_processed.toLocaleString()}
        />

        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Cache Hit Rate"
          value={`${hitRate}%`}
          subtitle={`${formatNumber(serverInfo.keyspace_hits)} hits, ${formatNumber(serverInfo.keyspace_misses)} misses`}
          variant={parseFloat(hitRate) > 90 ? "success" : parseFloat(hitRate) > 70 ? "warning" : "default"}
        />

        <StatCard
          icon={<Server className="w-5 h-5" />}
          label="Server Status"
          value="Running"
          variant="success"
        />
      </div>

      {/* Detailed Stats Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Detailed Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Redis Version
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {serverInfo.version}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Total Commands
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {serverInfo.total_commands_processed.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Keyspace Hits
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {serverInfo.keyspace_hits.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Keyspace Misses
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {serverInfo.keyspace_misses.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Memory (Bytes)
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {serverInfo.used_memory.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Instantaneous Ops/Sec
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {serverInfo.ops_per_sec.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
