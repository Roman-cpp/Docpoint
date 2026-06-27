import type { StateCreator } from "zustand";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * Состояние последнего ответа из панели "Try it". `body` хранится строкой
 * (как его вернул бэкенд / после pretty-print JSON), потребитель сам решает,
 * парсить ли её в дерево.
 */
export interface ApiResponse {
	ok?: boolean;
	status?: number;
	statusText?: string;
	dur: number;
	body?: string;
	error?: string;
}

type ResponseState = {
	response: ApiResponse | null;
};

type ResponseActions = {
	setResponse: (response: ApiResponse | null) => void;
	clearResponse: () => void;
};

export type ResponseStore = ResponseState & ResponseActions;

const initialState: ResponseState = {
	response: null,
};

const createResponseSlice: StateCreator<ResponseStore> = (set) => ({
	...initialState,
	setResponse: (response) => set({ response }),
	clearResponse: () => set({ response: null }),
});

// Эфемерное состояние — без persist: последний ответ не переживает перезапуск.
export const useResponseStore = create<ResponseStore>()(
	devtools(createResponseSlice, { name: "ResponseStore" }),
);
