import { useEffect, useState } from "react";
import { Users, Clock, Database, Terminal } from "lucide-react";
import { redisApi } from "../../lib/tauri-api";
import { ClientInfo } from "../../types/redis";
import { Card } from "../ui";

interface ClientListProps {
  connectionId: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function ClientList({ connectionId }: ClientListProps) {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
    const interval = setInterval(loadClients, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [connectionId]);

  const loadClients = async () => {
    try {
      setError(null);
      const clientList = await redisApi.getClientList(connectionId);
      setClients(clientList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500 dark:text-neutral-400">
          Loading connected clients...
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
            Connected Clients
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {clients.length} active connection{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
          <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {clients.length} Client{clients.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Clients Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  DB
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Age
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Idle
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Command
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400"
                  >
                    No connected clients
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-neutral-900 dark:text-white">
                        {client.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {client.addr || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {client.name || <span className="text-neutral-400">unnamed</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {client.db}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {formatDuration(client.age)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm ${
                          client.idle > 60
                            ? "text-warning-light dark:text-warning-dark"
                            : "text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {formatDuration(client.idle)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                          {client.cmd || "-"}
                        </span>
                      </div>
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
