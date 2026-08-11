import { type FC, useState } from "react";
import { useLocation, useParams } from "react-router";
import { useDocWebsocket } from "@/entities/websocket";
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
	// Карточка домена кладёт имя и адрес в состояние роутера — до ответа
	// запроса шапка показывает их, чтобы страница не открывалась пустой.
	const location = useLocation();
	const hint = location.state as { name?: string; url?: string } | null;

	const { websocket, isWebsocketLoading } = useDocWebsocket(id);
	const [draft, setDraft] = useState(DEFAULT_WS_DRAFT);

	const name = websocket?.name ?? hint?.name ?? "";
	const url = websocket?.url ?? hint?.url ?? "";
	const missing = !isWebsocketLoading && !websocket;

	return (
		<div className={s.wrapper}>
			<Header section="doc-ws" activeLink="websocket" />

			<div className={s.body}>
				{missing && !hint ? (
					<div className={s.notFound}>
						WebSocket не найден — возможно, он был удалён.
					</div>
				) : (
					<>
						<MessagesPanel websocketId={id} onApply={setDraft} />

						<div className={s.main}>
							<div className={s.docHead}>
								<div className={s.docTitleRow}>
									<h1 className={s.docName}>{name || "WebSocket"}</h1>
									<span className={s.docTag}>doc-ws</span>
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
		</div>
	);
};
