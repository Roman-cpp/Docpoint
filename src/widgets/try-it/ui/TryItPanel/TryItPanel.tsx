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
import { getEnvDotColor } from "@/shared/lib/env-color";
import { buildUrl, canHaveBody } from "../../lib/buildRequest";
import { getJsonError } from "../../lib/validateJson";
import type { RequestDraft } from "../../model/tryIt.types";
import { useEndpointRequests } from "../../model/useEndpointRequests";
import { useSendRequest } from "../../model/useSendRequest";
import { AuthNotice } from "../AuthNotice";
import { BodyEditor } from "../BodyEditor";
import { HeadersEditor } from "../HeadersEditor";
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
	// Невалидный JSON отправлять некуда — блокируем Send.
	const bodyError =
		hasBody && active.bodyMode === "raw" ? getJsonError(active.rawBody) : null;

	return (
		<div className={s.pane}>
			<div className={s.header}>
				<span className={s.title}>Try it</span>
				<span className={s.envPill}>
					<span
						className={s.envDot}
						style={{ background: getEnvDotColor(environment.env) }}
					/>
					{environment.label}
				</span>
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

				{endpoint.auth && <AuthNotice environmentId={environment.id} />}

				<ParamFields
					endpoint={endpoint}
					values={active.values}
					onChange={setValue}
				/>

				<HeadersEditor
					headers={active.headers}
					onChange={(headers) => patchActive({ headers })}
				/>

				{hasBody && (
					<BodyEditor
						endpoint={endpoint}
						env={environment}
						mode={active.bodyMode}
						rawBody={active.rawBody}
						values={active.values}
						onModeChange={(bodyMode) => patchActive({ bodyMode })}
						onRawBodyChange={(rawBody) => patchActive({ rawBody })}
						onValueChange={setValue}
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
