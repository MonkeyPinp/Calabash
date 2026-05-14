import { create } from 'zustand';
import type { User } from '@/types';
import { createUser, deleteUser, ensureUsers, listUsers, storeActiveUserId, updateUser } from '@/db/users';

interface UserStoreState {
  users: User[];
  activeUserId: string | null;
  hydrated: boolean;
  hydrateUsers: () => Promise<void>;
  setActiveUser: (id: string) => void;
  createProfile: (name: string) => Promise<User>;
  renameProfile: (id: string, name: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  users: [],
  activeUserId: null,
  hydrated: false,

  hydrateUsers: async () => {
    const { users, activeUserId } = await ensureUsers();
    set({ users, activeUserId, hydrated: true });
  },

  setActiveUser: (id) => {
    storeActiveUserId(id);
    set({ activeUserId: id });
  },

  createProfile: async (name) => {
    const user = await createUser({ name });
    const users = await listUsers();
    storeActiveUserId(user.id);
    set({ users, activeUserId: user.id, hydrated: true });
    return user;
  },

  renameProfile: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Profile name is required');
    await updateUser(id, { name: trimmed });
    set({ users: await listUsers() });
  },

  deleteProfile: async (id) => {
    const { users, activeUserId } = get();
    if (users.length <= 1) throw new Error('At least one profile is required');
    const fallback = users.find((user) => user.id !== id);
    if (!fallback) throw new Error('Fallback profile not found');
    await deleteUser(id, fallback.id);
    const nextUsers = await listUsers();
    const nextActiveUserId = activeUserId === id ? fallback.id : activeUserId;
    if (nextActiveUserId) storeActiveUserId(nextActiveUserId);
    set({ users: nextUsers, activeUserId: nextActiveUserId });
  },

  refreshUsers: async () => {
    set({ users: await listUsers() });
  },
}));
