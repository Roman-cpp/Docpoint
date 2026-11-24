import { type FC, useEffect, useState } from "react";
import {
	selectDocApi,
	selectSelectedEndpoint,
	useDocApiStore,
} from "@/features/doc-api";
import {
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { useResponseStore } from "@/features/request";
import { COMMON_HEADER_NAMES, NameValueEditor } from "@/shared/ui-kit/controls";
import { buildUrl, canHaveBody } from "../../lib/buildRequest";
import { getJsonError } from "../../lib/validateJson";
import type { RequestDraft } from "../../model/tryIt.types";
import { useEndpointRequests } from "../../model/useEndpointRequests";
import { useSendRequest } from "../../model/useSendRequest";
import { BodyEditor } from "../BodyEditor";
import { ParamFields } from "../ParamFields";
import { RequestTabs } from "../RequestTabs";
import { UrlBar } from "../UrlBar";
import s from "./TryItPanel.module.css";

/**
 * Панель "Try it": наборы значений параметров выбранного эндпоинта и отправка
 * запроса в выбранное окружение.
 */
export const TryItPanel: FC = () => {
	const endpoint = useDocApiStore(selectSelectedEndpoint);
	const doc = useDocApiStore(selectDocApi);
	const environment = useEnvironmentsStore(selectSelectedEnvironment);

	const endpointId = endpoint?.id ?? "";
	const {
		requests,
		active,
		activeId,
		selectRequest,
		patchActive,
		setValue,
		create,
		remove,
		rename,
	} = useEndpointRequests(endpointId);
	const { send, loading } = useSendRequest();

	// Свежесозданный набор сразу открывается на переименование.
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const createRequest = async (source?: RequestDraft | null) =>
		setRenamingId(await create(source));

	// Ответ от прошлого эндпоинта не имеет отношения к новому.
	useEffect(() => {
		if (endpointId) useResponseStore.getState().clearResponse();
	}, [endpointId]);

	if (!endpoint || !active || !environment) return null;

	const url = buildUrl(endpoint, environment, doc, active.values);
	const hasBody = canHaveBody(endpoint.method);
	// Невалидный JSON отправлять некуда — блокируем Send. Тело у обоих режимов
	// одно, поэтому и проверка одна: раньше форма не проверялась вовсе, и
	// сломанное тело уезжало, стоило переключиться на неё.
	const bodyError = hasBody ? getJsonError(active.body) : null;

	return (
		<div className={s.pane}>
			<div className={s.header}>
				<span className={s.title}>Try it</span>
			</div>

			<div className={s.body}>
				<RequestTabs
					requests={requests}
					activeId={activeId}
					renamingId={renamingId}
					onRenameHandled={() => setRenamingId(null)}
					onSelect={selectRequest}
					onRename={rename}
					onCreate={() => createRequest()}
					onDuplicate={() => createRequest(active)}
					onDelete={remove}
				/>

				<UrlBar method={endpoint.method} url={url} />

				<ParamFields
					endpoint={endpoint}
					values={active.values}
					onChange={setValue}
				/>

				<NameValueEditor
					title="Headers"
					addLabel="+ Add header"
					suggestions={COMMON_HEADER_NAMES}
					duplicateHint="Заголовок повторяется"
					rows={active.headers}
					onChange={(headers) => patchActive({ headers })}
				/>

				{/* Куки набора: в заголовок `Cookie` они собираются при отправке,
				    там же к ним домешивается сессия окружения. */}
				<NameValueEditor
					title="Cookies"
					addLabel="+ Add cookie"
					duplicateHint="Кука повторяется"
					rows={active.cookies}
					onChange={(cookies) => patchActive({ cookies })}
				/>

				{hasBody && (
					<BodyEditor
						endpoint={endpoint}
						mode={active.bodyMode}
						body={active.body}
						onModeChange={(bodyMode) => patchActive({ bodyMode })}
						onBodyChange={(body) => patchActive({ body })}
					/>
				)}

				<button
					className={s.sendBtn}
					disabled={loading || !!bodyError}
					onClick={() =>
						send({ endpoint, env: environment, doc, request: active })
					}
					type="button"
				>
					{loading ? (
						<>
							<span className={s.spinner} />
							Sending…
						</>
					) : (
						`Send ${endpoint.method}`
					)}
				</button>
			</div>
		</div>
	);
};
