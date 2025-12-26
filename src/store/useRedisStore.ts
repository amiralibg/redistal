import { create } from "zustand";
import { ConnectionConfig, RedisKey, StoredConnection } from "../types/redis";

interface RedisStore {
  connections: ConnectionConfig[];
  savedConnections: StoredConnection[];
  activeConnectionId: string | null;
  keys: string[];
  selectedKey: string | null;
  selectedKeyInfo: RedisKey | null;
  searchPattern: string;

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
}

export const useRedisStore = create<RedisStore>((set) => ({
  connections: [],
  savedConnections: [],
  activeConnectionId: null,
  keys: [],
  selectedKey: null,
  selectedKeyInfo: null,
  searchPattern: "*",

  setConnections: (connections) => set({ connections }),
  addConnection: (connection) =>
    set((state) => ({ connections: [...state.connections, connection] })),
  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      activeConnectionId:
        state.activeConnectionId === id ? null : state.activeConnectionId,
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
}));
