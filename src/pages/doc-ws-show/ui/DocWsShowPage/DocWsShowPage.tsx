import { type FC, useState } from "react";
import { useParams } from "react-router";
import { useDocWebsocket } from "@/entities/websocket";
import { EditWebsocketModal } from "@/features/websocket";
import { CatalogBackLink } from "@/widgets/catalog-explorer";
import { Header } from "@/widgets/header";
import { DEFAULT_WS_DRAFT, WsConsole } from "@/widgets/ws-console";
import { MessagesPanel } from "../MessagesPanel";
import s from "./DocWsShowPage.module.css";

/**
 * Документированный WebSocket: чем он является, куда подключается и какие
 * кадры для него сохранены. Консоль здесь та же, что и на /ws-client, но
 * адрес берётся из документации, а примеры сообщений — из базы.
 */
export const DocWsShowPage: FC = () => {
	const { id = "" } = useParams<{ id: string }>();
	const {
		websocket,
		isWebsocketLoading,
		updateWebsocket,
		isUpdatingWebsocket,
	} = useDocWebsocket(id);
	const [draft, setDraft] = useState(DEFAULT_WS_DRAFT);
	const [editing, setEditing] = useState(false);

	const name = websocket?.name ?? "";
	const url = websocket?.url ?? "";
	const missing = !isWebsocketLoading && !websocket;

	return (
		<div className={s.wrapper}>
			<Header section="doc-ws" activeLink="websocket" />

			<div className={s.body}>
				{missing ? (
					<div className={s.notFound}>
						WebSocket не найден — возможно, он был удалён.
					</div>
				) : (
					<>
						<MessagesPanel websocketId={id} onApply={setDraft} />

						<div className={s.main}>
							<div className={s.docHead}>
								<CatalogBackLink nodeId={id} className={s.docBack} />
								<div className={s.docTitleRow}>
									<h1 className={s.docName}>{name || "WebSocket"}</h1>
									<span className={s.docTag}>doc-ws</span>
									<button
										type="button"
										className={s.docEdit}
										onClick={() => setEditing(true)}
										disabled={!websocket}
									>
										Изменить
									</button>
								</div>
								{websocket?.desc && (
									<p className={s.docDesc}>{websocket.desc}</p>
								)}
							</div>

							<WsConsole
								initialUrl={url}
								draft={draft}
								onDraftChange={setDraft}
							/>
						</div>
					</>
				)}
			</div>

			{editing && websocket && (
				<EditWebsocketModal
					open
					onOpenChange={(open) => !open && setEditing(false)}
					websocket={websocket}
					isSaving={isUpdatingWebsocket}
					onSave={(updates) => {
						updateWebsocket(updates);
						setEditing(false);
					}}
				/>
			)}
		</div>
	);
};
