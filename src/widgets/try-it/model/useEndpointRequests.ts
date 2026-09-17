import { useEffect, useRef, useState } from "react";
import {
	createEndpointRequestApi,
	deleteEndpointRequestApi,
	type EndpointRequest,
	getEndpointRequestsApi,
	type UpdateEndpointRequestDTO,
	updateEndpointRequestApi,
} from "@/entities/doc-api";
import { splitValueKey, valueKey } from "../lib/buildRequest";
import { notifyError } from "../lib/notifyError";
import type { RequestDraft } from "./tryIt.types";

const SAVE_DEBOUNCE_MS = 500;

/** Преобразует набор из бэка во внутреннее представление. */
function toDraft(request: EndpointRequest): RequestDraft {
	const values: Record<string, string> = {};
	for (const v of request.values) values[valueKey(v.kind, v.name)] = v.value;

	return {
		id: request.id,
		name: request.name,
		bodyMode: request.bodyMode,
		body: request.body,
		headers: request.headers.map((header) => ({
			...header,
			id: crypto.randomUUID(),
		})),
		cookies: (request.cookies ?? []).map((cookie) => ({
			...cookie,
			id: crypto.randomUUID(),
		})),
		values,
	};
}

function toDto(draft: RequestDraft): UpdateEndpointRequestDTO {
	return {
		id: draft.id,
		name: draft.name,
		bodyMode: draft.bodyMode,
		body: draft.body,
		headers: draft.headers.map(({ name, value, enabled }) => ({
			name,
			value,
			enabled,
		})),
		cookies: draft.cookies.map(({ name, value, enabled }) => ({
			name,
			value,
			enabled,
		})),
		values: Object.entries(draft.values).map(([key, value]) => ({
			...splitValueKey(key),
			value,
		})),
	};
}

function save(draft: RequestDraft) {
	return updateEndpointRequestApi(toDto(draft)).catch((e) =>
		notifyError("Не удалось сохранить запрос", e),
	);
}

/**
 * Наборы параметров одного эндпоинта: загрузка, переключение, CRUD и
 * отложенное сохранение правок. Набор сохраняется целиком одним запросом.
 */
export function useEndpointRequests(endpointId: string) {
	const [requests, setRequests] = useState<RequestDraft[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	// Таймеры debounce-сохранения, по id набора.
	const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
	// Наборы, чьи правки ждут отправки: нужны, чтобы дописать их при закрытии.
	const pendingSaves = useRef<Record<string, RequestDraft>>({});

	// Уход со страницы не должен съедать правки, набранные за последние 500 мс.
	useEffect(() => {
		const timers = saveTimers.current;
		const pending = pendingSaves.current;
		return () => {
			for (const [id, draft] of Object.entries(pending)) {
				clearTimeout(timers[id]);
				save(draft);
			}
		};
	}, []);

	// Загружаем сохранённые наборы при смене эндпоинта. Если их нет — создаём
	// дефолтный, чтобы пользователю всегда было куда вводить значения.
	useEffect(() => {
		if (!endpointId) {
			setRequests([]);
			setActiveId(null);
			return;
		}
		let active = true;
		(async () => {
			try {
				let list = await getEndpointRequestsApi({ endpointId });
				if (list.length === 0) {
					list = [
						await createEndpointRequestApi({
							endpointId,
							name: "Request 1",
						}),
					];
				}
				if (!active) return;
				setRequests(list.map(toDraft));
				setActiveId(list[0].id);
			} catch (e) {
				notifyError("Не удалось загрузить запросы", e);
				if (!active) return;
				setRequests([]);
				setActiveId(null);
			}
		})();
		return () => {
			active = false;
		};
	}, [endpointId]);

	const active =
		requests.find((request) => request.id === activeId) ?? requests[0] ?? null;

	const scheduleSave = (draft: RequestDraft) => {
		pendingSaves.current[draft.id] = draft;
		clearTimeout(saveTimers.current[draft.id]);
		saveTimers.current[draft.id] = setTimeout(() => {
			delete pendingSaves.current[draft.id];
			save(draft);
		}, SAVE_DEBOUNCE_MS);
	};

	/** Правит активный набор и ставит его в очередь на сохранение. */
	const patchActive = (patch: Partial<Omit<RequestDraft, "id">>) => {
		if (!active) return;
		const next = { ...active, ...patch };
		setRequests((list) =>
			list.map((request) => (request.id === next.id ? next : request)),
		);
		scheduleSave(next);
	};

	/** Значение одного параметра в активном наборе. */
	const setValue = (key: string, value: string) => {
		if (!active) return;
		patchActive({ values: { ...active.values, [key]: value } });
	};

	const create = async (source?: RequestDraft | null) => {
		const name = source
			? `${source.name} copy`
			: `Request ${requests.length + 1}`;
		try {
			const created = await createEndpointRequestApi({ endpointId, name });
			const draft: RequestDraft = source
				? {
						...source,
						id: created.id,
						name,
						values: { ...source.values },
						cookies: source.cookies.map((cookie) => ({
							...cookie,
							id: crypto.randomUUID(),
						})),
						headers: source.headers.map((header) => ({
							...header,
							id: crypto.randomUUID(),
						})),
					}
				: toDraft(created);
			setRequests((list) => [...list, draft]);
			setActiveId(draft.id);
			if (source) await save(draft);
			return draft.id;
		} catch (e) {
			notifyError("Не удалось создать запрос", e);
			return null;
		}
	};

	const remove = async (id: string) => {
		if (requests.length <= 1) return;
		try {
			await deleteEndpointRequestApi({ id });
			clearTimeout(saveTimers.current[id]);
			delete pendingSaves.current[id];
			const next = requests.filter((request) => request.id !== id);
			setRequests(next);
			if (id === activeId) setActiveId(next[0]?.id ?? null);
		} catch (e) {
			notifyError("Не удалось удалить запрос", e);
		}
	};

	const rename = (id: string, rawName: string) => {
		const name = rawName.trim();
		const target = requests.find((request) => request.id === id);
		if (!name || !target || target.name === name) return;
		const next = { ...target, name };
		setRequests((list) =>
			list.map((request) => (request.id === id ? next : request)),
		);
		scheduleSave(next);
	};

	return {
		requests,
		active,
		activeId: active?.id ?? null,
		selectRequest: setActiveId,
		patchActive,
		setValue,
		create,
		remove,
		rename,
	};
}
