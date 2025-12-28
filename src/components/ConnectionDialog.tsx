import { useState, useEffect } from "react";
import {
  Server,
  Lock,
  Database as DatabaseIcon,
  Shield,
  Network,
  Key,
  FileKey,
} from "lucide-react";
import { ConnectionConfig } from "../types/redis";
import type { StoredConnection } from "../types/redis";
import { redisApi } from "../lib/tauri-api";
import { useRedisStore } from "../store/useRedisStore";
import { useToast } from "../lib/toast-context";
import { Dialog, Button, Input } from "./ui";

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editConnection?: StoredConnection;
}

export function ConnectionDialog({
  isOpen,
  onClose,
  editConnection,
}: ConnectionDialogProps) {
  const { addConnection, setActiveConnection, setSavedConnections } =
    useRedisStore();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: "Local Redis",
    host: "localhost",
    port: 6379,
    username: "",
    password: "",
    database: 0,
    use_tls: false,
    ssh_tunnel_enabled: false,
    ssh_host: "",
    ssh_port: 22,
    ssh_username: "",
    ssh_auth_method: "password" as "password" | "private_key",
    ssh_password: "",
    ssh_private_key_path: "",
    ssh_passphrase: "",
  });
  const [saveConnection, setSaveConnection] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Populate form when editing a connection
  useEffect(() => {
    if (editConnection && isOpen) {
      setFormData({
        name: editConnection.name,
        host: editConnection.host,
        port: editConnection.port,
        username: editConnection.username || "",
        password: "", // Don't pre-fill password for security
        database: editConnection.database,
        use_tls: editConnection.use_tls,
        ssh_tunnel_enabled: editConnection.ssh_tunnel?.enabled || false,
        ssh_host: editConnection.ssh_tunnel?.ssh_host || "",
        ssh_port: editConnection.ssh_tunnel?.ssh_port || 22,
        ssh_username: editConnection.ssh_tunnel?.ssh_username || "",
        ssh_auth_method: editConnection.ssh_tunnel?.auth_method || "password",
        ssh_password: "", // Don't pre-fill for security
        ssh_private_key_path:
          editConnection.ssh_tunnel?.ssh_private_key_path || "",
        ssh_passphrase: "", // Don't pre-fill for security
      });
      setSaveConnection(true);
    } else if (!isOpen) {
      // Reset form when dialog closes
      setFormData({
        name: "Local Redis",
        host: "localhost",
        port: 6379,
        username: "",
        password: "",
        database: 0,
        use_tls: false,
        ssh_tunnel_enabled: false,
        ssh_host: "",
        ssh_port: 22,
        ssh_username: "",
        ssh_auth_method: "password",
        ssh_password: "",
        ssh_private_key_path: "",
        ssh_passphrase: "",
      });
      setSaveConnection(true);
      setError("");
      setTestSuccess(false);
    }
  }, [editConnection, isOpen]);

  const handleTestConnection = async () => {
    setError("");
    setTestSuccess(false);
    setTesting(true);

    try {
      const config: ConnectionConfig = {
        id: crypto.randomUUID(), // Temporary ID for testing
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username || undefined,
        password: formData.password || undefined,
        database: formData.database,
        use_tls: formData.use_tls,
        ssh_tunnel: formData.ssh_tunnel_enabled
          ? {
              enabled: true,
              ssh_host: formData.ssh_host,
              ssh_port: formData.ssh_port,
              ssh_username: formData.ssh_username,
              auth_method: formData.ssh_auth_method,
              ssh_password:
                formData.ssh_auth_method === "password"
                  ? formData.ssh_password || undefined
                  : undefined,
              ssh_private_key_path:
                formData.ssh_auth_method === "private_key"
                  ? formData.ssh_private_key_path || undefined
                  : undefined,
              ssh_passphrase:
                formData.ssh_auth_method === "private_key"
                  ? formData.ssh_passphrase || undefined
                  : undefined,
            }
          : undefined,
      };

      const status = await redisApi.testConnection(config);

      if (status.connected) {
        setTestSuccess(true);
        toast.success("Connection successful", "Test connection succeeded");
      } else {
        const errorMsg = status.error || "Connection test failed";
        setError(errorMsg);
        toast.error("Connection test failed", errorMsg);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Connection test failed";
      setError(errorMsg);
      toast.error("Connection test failed", errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const config: ConnectionConfig = {
        id: editConnection ? editConnection.id : crypto.randomUUID(),
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username || undefined,
        password: formData.password || undefined,
        database: formData.database,
        use_tls: formData.use_tls,
        ssh_tunnel: formData.ssh_tunnel_enabled
          ? {
              enabled: true,
              ssh_host: formData.ssh_host,
              ssh_port: formData.ssh_port,
              ssh_username: formData.ssh_username,
              auth_method: formData.ssh_auth_method,
              ssh_password:
                formData.ssh_auth_method === "password"
                  ? formData.ssh_password || undefined
                  : undefined,
              ssh_private_key_path:
                formData.ssh_auth_method === "private_key"
                  ? formData.ssh_private_key_path || undefined
                  : undefined,
              ssh_passphrase:
                formData.ssh_auth_method === "private_key"
                  ? formData.ssh_passphrase || undefined
                  : undefined,
            }
          : undefined,
      };

      // If editing, we just update the saved connection without connecting
      if (editConnection) {
        if (saveConnection) {
          try {
            // Delete old connection
            await redisApi.deleteSavedConnection(editConnection.id);
            // Save updated connection
            await redisApi.saveConnection(config);

            // Reload connections to update the list
            const connections = await redisApi.loadConnections();
            setSavedConnections(connections);

            toast.success(
              "Connection updated",
              `Updated connection ${config.name}`,
            );
            onClose();
          } catch (saveError) {
            console.error("Failed to update connection:", saveError);
            toast.error(
              "Update failed",
              `Failed to update connection ${config.name}`,
            );
          }
        }
      } else {
        // New connection - connect to it
        const status = await redisApi.connect(config);

        if (status.connected) {
          addConnection(config);
          setActiveConnection(config.id);

          // Save connection to disk if requested
          if (saveConnection) {
            try {
              await redisApi.saveConnection(config);
              toast.success(
                "Connection saved",
                `Connected to ${config.name} and saved for future use`,
              );
            } catch (saveError) {
              console.error("Failed to save connection:", saveError);
              toast.warning(
                "Connected but not saved",
                `Connected to ${config.name} but failed to save connection`,
              );
            }
          } else {
            toast.success(
              "Connected successfully",
              `Connected to ${config.name}`,
            );
          }

          onClose();
        } else {
          const errorMsg = status.error || "Connection failed";
          setError(errorMsg);
          toast.error("Connection failed", errorMsg);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to connect";
      setError(errorMsg);
      toast.error("Connection error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editConnection ? "Edit Connection" : "New Connection"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Connection Name */}
        <Input
          label="Connection Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Production Redis"
          leftIcon={<Server className="w-4 h-4" />}
          required
        />

        {/* Host and Port */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Host"
            type="text"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            placeholder="localhost"
            required
          />

          <Input
            label="Port"
            type="number"
            value={formData.port}
            onChange={(e) =>
              setFormData({
                ...formData,
                port: parseInt(e.target.value) || 6379,
              })
            }
            placeholder="6379"
            required
          />
        </div>

        {/* Authentication */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Authentication (Optional)
          </h3>

          <Input
            label="Username"
            type="text"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            placeholder="default"
            helperText="Leave empty if not using ACL"
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder="••••••••"
          />
        </div>

        {/* Database and TLS */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Input
            label="Database"
            type="number"
            value={formData.database}
            onChange={(e) =>
              setFormData({
                ...formData,
                database: parseInt(e.target.value) || 0,
              })
            }
            min="0"
            max="15"
            leftIcon={<DatabaseIcon className="w-4 h-4" />}
            helperText="0-15"
            required
          />

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Security
            </label>
            <label className="flex items-center gap-3 p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <input
                type="checkbox"
                checked={formData.use_tls}
                onChange={(e) =>
                  setFormData({ ...formData, use_tls: e.target.checked })
                }
                className="w-4 h-4 text-brand-600 bg-neutral-100 border-neutral-300 rounded focus:ring-brand-500 focus:ring-2"
              />
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Use TLS/SSL
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* SSH Tunnel Configuration */}
        <div className="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <Network className="w-4 h-4" />
              SSH Tunnel (Optional)
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.ssh_tunnel_enabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ssh_tunnel_enabled: e.target.checked,
                  })
                }
                className="w-4 h-4 text-brand-600 bg-neutral-100 border-neutral-300 rounded focus:ring-brand-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Enable SSH Tunnel
              </span>
            </label>
          </div>

          {formData.ssh_tunnel_enabled && (
            <div className="space-y-4 pl-6 border-l-2 border-brand-500">
              {/* SSH Host and Port */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SSH Host"
                  type="text"
                  value={formData.ssh_host}
                  onChange={(e) =>
                    setFormData({ ...formData, ssh_host: e.target.value })
                  }
                  placeholder="ssh.example.com"
                  required={formData.ssh_tunnel_enabled}
                />

                <Input
                  label="SSH Port"
                  type="number"
                  value={formData.ssh_port}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ssh_port: parseInt(e.target.value) || 22,
                    })
                  }
                  placeholder="22"
                  required={formData.ssh_tunnel_enabled}
                />
              </div>

              {/* SSH Username */}
              <Input
                label="SSH Username"
                type="text"
                value={formData.ssh_username}
                onChange={(e) =>
                  setFormData({ ...formData, ssh_username: e.target.value })
                }
                placeholder="ubuntu"
                required={formData.ssh_tunnel_enabled}
              />

              {/* SSH Authentication Method */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Authentication Method
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ssh_auth_method"
                      value="password"
                      checked={formData.ssh_auth_method === "password"}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          ssh_auth_method: "password",
                        })
                      }
                      className="w-4 h-4 text-brand-600 bg-neutral-100 border-neutral-300 focus:ring-brand-500 focus:ring-2"
                    />
                    <Key className="w-4 h-4 text-neutral-500" />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      Password
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ssh_auth_method"
                      value="private_key"
                      checked={formData.ssh_auth_method === "private_key"}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          ssh_auth_method: "private_key",
                        })
                      }
                      className="w-4 h-4 text-brand-600 bg-neutral-100 border-neutral-300 focus:ring-brand-500 focus:ring-2"
                    />
                    <FileKey className="w-4 h-4 text-neutral-500" />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      Private Key
                    </span>
                  </label>
                </div>
              </div>

              {/* SSH Password or Private Key */}
              {formData.ssh_auth_method === "password" ? (
                <Input
                  label="SSH Password"
                  type="password"
                  value={formData.ssh_password}
                  onChange={(e) =>
                    setFormData({ ...formData, ssh_password: e.target.value })
                  }
                  placeholder="••••••••"
                  required={formData.ssh_tunnel_enabled}
                />
              ) : (
                <>
                  <Input
                    label="Private Key Path"
                    type="text"
                    value={formData.ssh_private_key_path}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ssh_private_key_path: e.target.value,
                      })
                    }
                    placeholder="~/.ssh/id_rsa"
                    helperText="Absolute path to your SSH private key file"
                    required={formData.ssh_tunnel_enabled}
                  />
                  <Input
                    label="Passphrase (Optional)"
                    type="password"
                    value={formData.ssh_passphrase}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ssh_passphrase: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                    helperText="Leave empty if key is not encrypted"
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Save Connection Option */}
        <div className="pt-2">
          <label className="flex items-center gap-3 p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <input
              type="checkbox"
              checked={saveConnection}
              onChange={(e) => setSaveConnection(e.target.checked)}
              className="w-4 h-4 text-brand-600 bg-neutral-100 border-neutral-300 rounded focus:ring-brand-500 focus:ring-2"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Save connection for future use
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Connection details will be saved locally. Passwords are stored
                securely in your system keychain.
              </p>
            </div>
          </label>
        </div>

        {/* Test Connection Success Message */}
        {testSuccess && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-slide-down">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              ✓ Connection test successful
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-slide-down">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              {error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          {!editConnection && (
            <Button
              type="button"
              onClick={handleTestConnection}
              variant="outline"
              loading={testing}
              className="flex-1"
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="flex-1"
          >
            {loading ? "Connecting..." : editConnection ? "Update" : "Connect"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
