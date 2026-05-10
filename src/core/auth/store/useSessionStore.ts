import { create } from "zustand";

export interface User {
	id: string;
	email: string;
	name: string;
	role: "admin" | "trader";
}

interface SessionStore {
	user: User | null;
	accessToken: string | null;
	isAuth: () => boolean;
	isLoading: boolean;

	fetchToken: () => Promise<void>;
	fetchUser: () => Promise<void>;
	setAuth: (user: User, token: string) => void;
	clearSession: () => void;
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
	user: null,
	accessToken: null,
	isLoading: false,

	isAuth: () => Boolean(get().accessToken),

	fetchToken: async () => {
		// TODO: call refresh endpoint → set({ accessToken: token })
	},

	fetchUser: async () => {
		// TODO: call /me endpoint → set({ user })
	},

	setAuth: (user, token) => set({ user, accessToken: token }),

	clearSession: () => set({ user: null, accessToken: null }),
}));
