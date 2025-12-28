import { useState } from "react";
import { Database, Trash2, Edit2 } from "lucide-react";
import { Dialog, Button, Badge, IconButton } from "./ui";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useRedisStore } from "../store/useRedisStore";
import { useToast } from "../lib/toast-context";
import { redisApi } from "../lib/tauri-api";
import type { StoredConnection } from "../types/redis";

interface ConnectionListProps {
  isOpen: boolean;
  onClose: () => void;
  onEditConnection?: (connection: StoredConnection) => void;
}

export function ConnectionList({
  isOpen,
  onClose,
  onEditConnection,
}: ConnectionListProps) {
  const {
    savedConnections,
    removeSavedConnection,
    activeConnectionId,
    addConnection,
    setActiveConnection,
  } = useRedisStore();
  const toast = useToast();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    connection: StoredConnection | null;
  }>({ show: false, connection: null });

  const handleConnect = async (connection: StoredConnection) => {
    setConnectingId(connection.id);
    try {
      // Get password from keychain
      const password = await redisApi.getConnectionPassword(connection.id);

      // Get SSH credentials from keychain if SSH tunnel is enabled
      let sshPassword: string | null = null;
      let sshPassphrase: string | null = null;
      if (connection.ssh_tunnel?.enabled) {
        if (connection.ssh_tunnel.auth_method === "Password") {
          sshPassword = await redisApi.getSshPassword(connection.id);
        } else if (connection.ssh_tunnel.auth_method === "PrivateKey") {
          sshPassphrase = await redisApi.getSshPassphrase(connection.id);
        }
      }

      // Build full config with password and SSH credentials
      const config = {
        ...connection,
        password: password || undefined,
        ssh_tunnel: connection.ssh_tunnel?.enabled
          ? {
              ...connection.ssh_tunnel,
              ssh_password: sshPassword || undefined,
              ssh_passphrase: sshPassphrase || undefined,
            }
          : undefined,
      };

      // Connect to Redis
      const status = await redisApi.connect(config);

      if (!status.connected) {
        throw new Error(status.error || "Connection failed");
      }

      // Add to active connections and set as active
      addConnection(config);
      setActiveConnection(connection.id);

      toast.success(
        "Connected",
        `Successfully connected to ${connection.name}`,
      );
      onClose();
    } catch (error) {
      toast.error(
        "Connection failed",
        error instanceof Error ? error.message : "Failed to connect",
      );
    } finally {
      setConnectingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.connection) return;

    try {
      const success = await redisApi.deleteSavedConnection(
        deleteConfirm.connection.id,
      );

      if (success) {
        removeSavedConnection(deleteConfirm.connection.id);
        toast.success(
          "Connection deleted",
          `Removed ${deleteConfirm.connection.name} from saved connections`,
        );
      } else {
        toast.error("Delete failed", "Failed to delete connection");
      }
    } catch (error) {
      toast.error(
        "Delete failed",
        error instanceof Error ? error.message : "Failed to delete connection",
      );
    } finally {
      setDeleteConfirm({ show: false, connection: null });
    }
  };

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} title="Saved Connections">
        <div className="space-y-3">
          {savedConnections.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">
                No saved connections yet
              </p>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                Create a new connection and check "Save connection" to see it
                here
              </p>
            </div>
          ) : (
            savedConnections.map((connection) => {
              const isActive = activeConnectionId === connection.id;
              const isConnecting = connectingId === connection.id;

              return (
                <div
                  key={connection.id}
                  className={`
                    p-4 rounded-lg border transition-all
                    ${
                      isActive
                        ? "border-brand-600 dark:border-blue-400 bg-brand-50 dark:bg-blue-500/10"
                        : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-brand-400 dark:hover:border-brand-600"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                          {connection.name}
                        </h3>
                        {isActive && (
                          <Badge variant="success" size="sm">
                            Connected
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="default" size="sm">
                          {connection.host}:{connection.port}
                        </Badge>
                        <Badge variant="info" size="sm">
                          DB {connection.database}
                        </Badge>
                        {connection.username && (
                          <Badge variant="default" size="sm">
                            {connection.username}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isActive && (
                        <Button
                          onClick={() => handleConnect(connection)}
                          variant="primary"
                          size="sm"
                          loading={isConnecting}
                          disabled={isConnecting}
                        >
                          Connect
                        </Button>
                      )}

                      {onEditConnection && (
                        <IconButton
                          onClick={() => onEditConnection(connection)}
                          variant="ghost"
                          size="sm"
                          title="Edit connection"
                          disabled={isConnecting}
                        >
                          <Edit2 className="w-4 h-4" />
                        </IconButton>
                      )}

                      <IconButton
                        onClick={() =>
                          setDeleteConfirm({ show: true, connection })
                        }
                        variant="ghost"
                        size="sm"
                        title="Delete connection"
                        disabled={isConnecting}
                      >
                        <Trash2 className="w-4 h-4 text-error-light dark:text-error-dark" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, connection: null })}
        onConfirm={handleDelete}
        title="Delete Connection"
        message={`Are you sure you want to delete "${deleteConfirm.connection?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
