import { useState } from "react";
import {
  FileText,
  List as ListIcon,
  Hash,
  Grid,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Dialog, Button, Input } from "./ui";
import { useRedisStore } from "../store/useRedisStore";
import { useToast } from "../lib/toast-context";
import { redisApi } from "../lib/tauri-api";

interface CreateKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type RedisKeyType = "string" | "list" | "hash" | "set" | "zset" | "stream";

interface KeyTypeOption {
  type: RedisKeyType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const KEY_TYPES: KeyTypeOption[] = [
  {
    type: "string",
    label: "String",
    icon: <FileText className="w-5 h-5" />,
    description: "Simple key-value pair for text or binary data",
  },
  {
    type: "list",
    label: "List",
    icon: <ListIcon className="w-5 h-5" />,
    description: "Ordered collection of strings",
  },
  {
    type: "hash",
    label: "Hash",
    icon: <Hash className="w-5 h-5" />,
    description: "Map of field-value pairs",
  },
  {
    type: "set",
    label: "Set",
    icon: <Grid className="w-5 h-5" />,
    description: "Unordered collection of unique strings",
  },
  {
    type: "zset",
    label: "Sorted Set",
    icon: <TrendingUp className="w-5 h-5" />,
    description: "Ordered set with scores",
  },
  {
    type: "stream",
    label: "Stream",
    icon: <Activity className="w-5 h-5" />,
    description: "Append-only log of messages",
  },
];

export function CreateKeyDialog({ isOpen, onClose }: CreateKeyDialogProps) {
  const { activeConnectionId, setKeys, keys, setSelectedKey, safeMode } =
    useRedisStore();
  const toast = useToast();
  const [step, setStep] = useState<"type" | "details">("type");
  const [selectedType, setSelectedType] = useState<RedisKeyType>("string");
  const [keyName, setKeyName] = useState("");
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setStep("type");
    setSelectedType("string");
    setKeyName("");
    setValue("");
    setTtl("");
    onClose();
  };

  const handleTypeSelect = (type: RedisKeyType) => {
    setSelectedType(type);
    setStep("details");
  };

  const handleCreate = async () => {
    if (!activeConnectionId || !keyName.trim()) return;

    if (safeMode) {
      toast.warning(
        "Safe mode enabled",
        "Cannot create keys in safe mode. Disable safe mode to make changes.",
      );
      return;
    }

    setLoading(true);
    try {
      const trimmedKey = keyName.trim();

      // Create the key based on type
      switch (selectedType) {
        case "string":
          await redisApi.setValue(activeConnectionId, trimmedKey, value);
          break;
        case "list":
          // Create empty list or with initial value
          if (value.trim()) {
            const command = `RPUSH ${trimmedKey} "${value.replace(/"/g, '\\"')}"`;
            await redisApi.executeCommand(activeConnectionId, command);
          } else {
            // Create empty list by pushing and popping
            await redisApi.executeCommand(
              activeConnectionId,
              `RPUSH ${trimmedKey} ""`,
            );
            await redisApi.executeCommand(
              activeConnectionId,
              `RPOP ${trimmedKey}`,
            );
          }
          break;
        case "hash":
          // Create empty hash or with initial field
          if (value.trim()) {
            const command = `HSET ${trimmedKey} "field1" "${value.replace(/"/g, '\\"')}"`;
            await redisApi.executeCommand(activeConnectionId, command);
          } else {
            // Create empty hash
            await redisApi.executeCommand(
              activeConnectionId,
              `HSET ${trimmedKey} "field1" ""`,
            );
            await redisApi.executeCommand(
              activeConnectionId,
              `HDEL ${trimmedKey} "field1"`,
            );
          }
          break;
        case "set":
          // Create set with initial member
          if (value.trim()) {
            const command = `SADD ${trimmedKey} "${value.replace(/"/g, '\\"')}"`;
            await redisApi.executeCommand(activeConnectionId, command);
          } else {
            // Create empty set
            await redisApi.executeCommand(
              activeConnectionId,
              `SADD ${trimmedKey} ""`,
            );
            await redisApi.executeCommand(
              activeConnectionId,
              `SREM ${trimmedKey} ""`,
            );
          }
          break;
        case "zset":
          // Create sorted set with initial member
          if (value.trim()) {
            const command = `ZADD ${trimmedKey} 0 "${value.replace(/"/g, '\\"')}"`;
            await redisApi.executeCommand(activeConnectionId, command);
          } else {
            // Create empty zset
            await redisApi.executeCommand(
              activeConnectionId,
              `ZADD ${trimmedKey} 0 ""`,
            );
            await redisApi.executeCommand(
              activeConnectionId,
              `ZREM ${trimmedKey} ""`,
            );
          }
          break;
        case "stream":
          // Create stream with initial message
          if (value.trim()) {
            const command = `XADD ${trimmedKey} * message "${value.replace(/"/g, '\\"')}"`;
            await redisApi.executeCommand(activeConnectionId, command);
          } else {
            // Create stream with a placeholder message then delete it
            const result = await redisApi.executeCommand(
              activeConnectionId,
              `XADD ${trimmedKey} * init "true"`,
            );
            // Delete the initialization message
            await redisApi.executeCommand(
              activeConnectionId,
              `XDEL ${trimmedKey} ${result}`,
            );
          }
          break;
      }

      // Set TTL if specified
      if (ttl && parseInt(ttl) > 0) {
        await redisApi.setTtl(activeConnectionId, trimmedKey, parseInt(ttl));
      }

      // Refresh keys list and select the new key
      setKeys([...keys, trimmedKey]);
      setSelectedKey(trimmedKey);

      toast.success(
        "Key created",
        `Successfully created ${selectedType} key "${trimmedKey}"`,
      );

      handleClose();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to create key";
      toast.error("Create failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === "type"
          ? "Create New Key"
          : `Create ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Key`
      }
      size="md"
    >
      {step === "type" ? (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Select the type of key you want to create
          </p>
          {KEY_TYPES.map((option) => (
            <button
              key={option.type}
              onClick={() => handleTypeSelect(option.type)}
              className="w-full p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-brand-600 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20 transition-colors text-neutral-600 dark:text-neutral-400 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                    {option.label}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Key Name"
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="e.g., user:1000, session:abc123"
            required
            autoFocus
          />

          <Input
            label={
              selectedType === "string"
                ? "Value"
                : selectedType === "hash"
                  ? "Initial Field Value (optional)"
                  : selectedType === "stream"
                    ? "Initial Message (optional)"
                    : "Initial Value (optional)"
            }
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              selectedType === "string"
                ? "Enter value"
                : selectedType === "hash"
                  ? "field1 value"
                  : selectedType === "stream"
                    ? "First message content"
                    : "Initial member/element"
            }
          />

          <Input
            label="TTL (seconds, optional)"
            type="number"
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            placeholder="Leave empty for no expiration"
            min="1"
          />

          <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              onClick={() => setStep("type")}
              variant="outline"
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleCreate}
              variant="primary"
              loading={loading}
              disabled={
                !keyName.trim() ||
                (selectedType === "string" && !value.trim()) ||
                safeMode
              }
              className="flex-1"
            >
              {loading ? "Creating..." : "Create Key"}
            </Button>
          </div>
        </div>
      )}

      {step === "type" && (
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button onClick={handleClose} variant="secondary">
            Cancel
          </Button>
        </div>
      )}
    </Dialog>
  );
}
