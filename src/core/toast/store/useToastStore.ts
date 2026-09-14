import { create } from "zustand";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface ToastItem {
	id: string;
	title: string;
	description?: string;
	variant?: ToastVariant;
	action?: {
		label: string;
		onClick: () => void;
	};
	duration?: number;
}

interface ToastStore {
	toasts: ToastItem[];
	add: (toast: Omit<ToastItem, "id">) => void;
	remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
	toasts: [],
	add: (item) =>
		set((state) => ({
			toasts: [...state.toasts, { ...item, id: crypto.randomUUID() }],
		})),
	remove: (id) =>
		set((state) => ({
			toasts: state.toasts.filter((t) => t.id !== id),
		})),
}));

export const toast = (item: Omit<ToastItem, "id">) =>
	useToastStore.getState().add(item);
