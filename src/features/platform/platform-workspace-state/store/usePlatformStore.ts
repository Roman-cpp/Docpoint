import type { StateCreator } from "zustand";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { Platform } from "@/entities/platform";
import { getPlatformApi } from "@/entities/platform";

type PlatformState = {
	platform: Platform | null;
};

type PlatformActions = {
	fetchPlatform: (id: string) => Promise<void>;
	resetPlatform: () => void;
};

const initialState: PlatformState = {
	platform: null,
};

export type PlatformStore = PlatformState & PlatformActions;

const createPlatformSlice: StateCreator<PlatformStore> = (set) => ({
	...initialState,

	resetPlatform: () => set(initialState),

	fetchPlatform: async (id) => {
		try {
			const platform = await getPlatformApi({ id });
			set({ platform });
		} catch (e) {
			console.error("[PlatformStore] fetchPlatform failed:", e);
			throw e;
		}
	},
});

export const usePlatformStore = create<PlatformStore>()(
	devtools(
		persist(createPlatformSlice, {
			name: "PlatformStore",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				platform: state.platform,
			}),
		}),
		{ name: "PlatformStore" },
	),
);
