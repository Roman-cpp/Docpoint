import type { StateCreator } from "zustand";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

/** Заголовок ответа. Списком, а не мапой: `Set-Cookie` приходит не один. */
export interface ResponseHeader {
	key: string;
	value: string;
}

/**
 * Состояние последнего ответа из панели "Try it". `body` хранится строкой
 * (как его вернул бэкенд / после pretty-print JSON), потребитель сам решает,
 * парсить ли её в дерево. Пустая строка — ответ без тела, это не то же самое,
 * что отсутствие ответа.
 */
export interface ApiResponse {
	ok?: boolean;
	status?: number;
	statusText?: string;
	dur: number;
	body?: string;
	headers?: ResponseHeader[];
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
