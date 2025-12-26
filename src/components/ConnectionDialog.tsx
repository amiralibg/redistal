import { useState } from "react";
import { Server, Lock, Database as DatabaseIcon, Shield } from "lucide-react";
import { ConnectionConfig } from "../types/redis";
import { redisApi } from "../lib/tauri-api";
import { useRedisStore } from "../store/useRedisStore";
import { useToast } from "../lib/toast-context";
import { Dialog, Button, Input } from "./ui";

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionDialog({ isOpen, onClose }: ConnectionDialogProps) {
  const { addConnection, setActiveConnection } = useRedisStore();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: "Local Redis",
    host: "localhost",
    port: 6379,
    username: "",
    password: "",
    database: 0,
    use_tls: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const config: ConnectionConfig = {
        id: crypto.randomUUID(),
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username || undefined,
        password: formData.password || undefined,
        database: formData.database,
        use_tls: formData.use_tls,
      };

      const status = await redisApi.connect(config);

      if (status.connected) {
        addConnection(config);
        setActiveConnection(config.id);
        toast.success("Connected successfully", `Connected to ${config.name}`);
        onClose();
        // Reset form
        setFormData({
          name: "Local Redis",
          host: "localhost",
          port: 6379,
          username: "",
          password: "",
          database: 0,
          use_tls: false,
        });
      } else {
        const errorMsg = status.error || "Connection failed";
        setError(errorMsg);
        toast.error("Connection failed", errorMsg);
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
    <Dialog isOpen={isOpen} onClose={onClose} title="New Connection" size="md">
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
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="flex-1"
          >
            {loading ? "Connecting..." : "Connect"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
