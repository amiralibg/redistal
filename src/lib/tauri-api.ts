import { invoke } from '@tauri-apps/api/core';
import { ConnectionConfig, ConnectionStatus, RedisKey, RedisValue } from '../types/redis';

export const redisApi = {
  async connect(config: ConnectionConfig): Promise<ConnectionStatus> {
    return invoke('connect_to_redis', { config });
  },

  async disconnect(connectionId: string): Promise<boolean> {
    return invoke('disconnect_from_redis', { connectionId });
  },

  async getKeys(connectionId: string, pattern: string): Promise<string[]> {
    return invoke('get_keys', { connectionId, pattern });
  },

  async getKeyInfo(connectionId: string, key: string): Promise<RedisKey> {
    return invoke('get_key_info', { connectionId, key });
  },

  async getValue(connectionId: string, key: string): Promise<RedisValue> {
    return invoke('get_value', { connectionId, key });
  },

  async setValue(connectionId: string, key: string, value: string): Promise<void> {
    return invoke('set_value', { connectionId, key, value });
  },

  async deleteKey(connectionId: string, key: string): Promise<void> {
    return invoke('delete_key', { connectionId, key });
  },

  async setTtl(connectionId: string, key: string, ttl: number): Promise<void> {
    return invoke('set_ttl', { connectionId, key, ttl });
  },

  async executeCommand(connectionId: string, command: string): Promise<string> {
    return invoke('execute_command', { connectionId, command });
  },
};
