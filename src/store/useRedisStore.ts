import { create } from "zustand";
import {
  ConnectionConfig,
  RedisKey,
  StoredConnection,
  RedisDataType,
} from "../types/redis";

interface RedisStore {
  connections: ConnectionConfig[];
  savedConnections: StoredConnection[];
  activeConnectionId: string | null;
  keys: string[];
  selectedKey: string | null;
  selectedKeyInfo: RedisKey | null;
  searchPattern: string;
  keyTypeFilter: RedisDataType | "all";
  safeMode: boolean;

  setConnections: (connections: ConnectionConfig[]) => void;
  addConnection: (connection: ConnectionConfig) => void;
  removeConnection: (id: string) => void;
  setSavedConnections: (connections: StoredConnection[]) => void;
  removeSavedConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  setKeys: (keys: string[]) => void;
  setSelectedKey: (key: string | null) => void;
  setSelectedKeyInfo: (info: RedisKey | null) => void;
  setSearchPattern: (pattern: string) => void;
  setKeyTypeFilter: (filter: RedisDataType | "all") => void;
  setSafeMode: (enabled: boolean) => void;
}

export const useRedisStore = create<RedisStore>((set) => ({
  connections: [],
  savedConnections: [],
  activeConnectionId: null,
  keys: [],
  selectedKey: null,
  selectedKeyInfo: null,
  searchPattern: "*",
  keyTypeFilter: "all",
  safeMode: false,

  setConnections: (connections) => set({ connections }),
  addConnection: (connection) =>
    set((state) => ({ connections: [...state.connections, connection] })),
  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      activeConnectionId:
        state.activeConnectionId === id ? null : state.activeConnectionId,
      // Clear keys and selection when disconnecting the active connection
      keys: state.activeConnectionId === id ? [] : state.keys,
      selectedKey: state.activeConnectionId === id ? null : state.selectedKey,
      selectedKeyInfo:
        state.activeConnectionId === id ? null : state.selectedKeyInfo,
    })),
  setSavedConnections: (connections) => set({ savedConnections: connections }),
  removeSavedConnection: (id) =>
    set((state) => ({
      savedConnections: state.savedConnections.filter((c) => c.id !== id),
    })),
  setActiveConnection: (id) =>
    set({ activeConnectionId: id, keys: [], selectedKey: null }),
  setKeys: (keys) => set({ keys }),
  setSelectedKey: (key) => set({ selectedKey: key }),
  setSelectedKeyInfo: (info) => set({ selectedKeyInfo: info }),
  setSearchPattern: (pattern) => set({ searchPattern: pattern }),
  setKeyTypeFilter: (filter) => set({ keyTypeFilter: filter }),
  setSafeMode: (enabled) => set({ safeMode: enabled }),
}));
