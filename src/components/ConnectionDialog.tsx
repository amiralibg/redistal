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
    ssh_auth_method: "Password" as "Password" | "PrivateKey",
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
        ssh_auth_method: editConnection.ssh_tunnel?.auth_method || "Password",
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
        ssh_auth_method: "Password",
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
                formData.ssh_auth_method === "Password"
                  ? formData.ssh_password || undefined
                  : undefined,
              ssh_private_key_path:
                formData.ssh_auth_method === "PrivateKey"
                  ? formData.ssh_private_key_path || undefined
                  : undefined,
              ssh_passphrase:
                formData.ssh_auth_method === "PrivateKey"
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
                formData.ssh_auth_method === "Password"
                  ? formData.ssh_password || undefined
                  : undefined,
              ssh_private_key_path:
                formData.ssh_auth_method === "PrivateKey"
                  ? formData.ssh_private_key_path || undefined
                  : undefined,
              ssh_passphrase:
                formData.ssh_auth_method === "PrivateKey"
                  ? formData.ssh_passphrase || undefined
                  : undefined,
            }
          : undefined,
      };

      console.log(config);

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
            required
          />

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Security
            </label>
            <label className="flex items-center gap-3 py-2.5 px-3 border border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
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
        <div className="space-y-4">
          <label className="group flex items-center justify-between p-4 bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800 rounded-xl cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-purple-500 rounded-md">
                <Network className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-purple-900 dark:text-purple-100">
                  SSH Tunnel
                </h3>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Connect through an SSH server
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.ssh_tunnel_enabled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ssh_tunnel_enabled: e.target.checked,
                })
              }
              className="w-5 h-5 text-brand-600 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 rounded focus:ring-brand-500 focus:ring-2 cursor-pointer"
            />
          </label>

          {formData.ssh_tunnel_enabled && (
            <div className="space-y-4 p-4 bg-white dark:bg-neutral-900 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm">
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
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Authentication Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.ssh_auth_method === "Password"
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
                        : "border-neutral-300 dark:border-neutral-700 hover:border-brand-400 dark:hover:border-brand-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ssh_auth_method"
                      value="Password"
                      checked={formData.ssh_auth_method === "Password"}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          ssh_auth_method: "Password",
                        })
                      }
                      className="w-4 h-4 text-brand-600 bg-neutral-100 border-neutral-300 focus:ring-brand-500 focus:ring-2"
                    />
                    <Key
                      className={`w-4 h-4 ${formData.ssh_auth_method === "Password" ? "text-brand-600" : "text-neutral-500"}`}
                    />
                    <span
                      className={`text-sm font-medium ${formData.ssh_auth_method === "Password" ? "text-brand-700 dark:text-brand-300" : "text-neutral-700 dark:text-neutral-300"}`}
                    >
                      Password
                    </span>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.ssh_auth_method === "PrivateKey"
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
                        : "border-neutral-300 dark:border-neutral-700 hover:border-brand-400 dark:hover:border-brand-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ssh_auth_method"
                      value="PrivateKey"
                      checked={formData.ssh_auth_method === "PrivateKey"}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          ssh_auth_method: "PrivateKey",
                        })
                      }
                      className="w-4 h-4 text-brand-600 bg-neutral-100 border-neutral-300 focus:ring-brand-500 focus:ring-2"
                    />
                    <FileKey
                      className={`w-4 h-4 ${formData.ssh_auth_method === "PrivateKey" ? "text-brand-600" : "text-neutral-500"}`}
                    />
                    <span
                      className={`text-sm font-medium ${formData.ssh_auth_method === "PrivateKey" ? "text-brand-700 dark:text-brand-300" : "text-neutral-700 dark:text-neutral-300"}`}
                    >
                      Private Key
                    </span>
                  </label>
                </div>
              </div>

              {/* SSH Password or Private Key */}
              {formData.ssh_auth_method === "Password" ? (
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
        <label className="group flex items-start gap-4 p-4 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-all">
          <input
            type="checkbox"
            checked={saveConnection}
            onChange={(e) => setSaveConnection(e.target.checked)}
            className="mt-1 w-5 h-5 text-brand-600 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 rounded focus:ring-brand-500 focus:ring-2 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <DatabaseIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                Save connection for future use
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Connection details will be saved locally. Passwords are stored
              securely in your system keychain for maximum security.
            </p>
          </div>
        </label>

        {/* Test Connection Success Message */}
        {testSuccess && (
          <div className="p-4 bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border-2 border-green-400 dark:border-green-600 rounded-xl shadow-lg animate-slide-down">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">✓</span>
              </div>
              <p className="text-sm text-green-800 dark:text-green-300 font-semibold">
                Connection test successful! Ready to connect.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-linear-to-r from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 border-2 border-red-400 dark:border-red-600 rounded-xl shadow-lg animate-slide-down">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">✕</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                  Connection Failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 wrap-break-word">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-6">
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="flex-1 h-12 text-base font-semibold shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 transition-all"
            >
              {loading
                ? "Connecting..."
                : editConnection
                  ? "Update Connection"
                  : "Connect to Redis"}
            </Button>
          </div>

          <div className="flex gap-3">
            {!editConnection && (
              <Button
                type="button"
                onClick={handleTestConnection}
                variant="outline"
                loading={testing}
                className="flex-1 h-10"
              >
                {testing ? "Testing..." : "Test Connection"}
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className={!editConnection ? "w-32 h-10" : "flex-1 h-10"}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
