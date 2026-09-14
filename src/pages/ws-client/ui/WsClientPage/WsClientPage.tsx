import { type FC, useState } from "react";
import { Header } from "@/widgets/layout";
import { DEFAULT_WS_DRAFT, WsConsole } from "@/widgets/ws-console";
import s from "./WsClientPage.module.css";

/**
 * Подключение к произвольному WebSocket: адрес вводится руками, ничего не
 * сохраняется. Для сокета, описанного в документации, есть /doc-ws-show/:id —
 * там та же консоль, но с сохранёнными примерами сообщений.
 */
export const WsClientPage: FC = () => {
	const [draft, setDraft] = useState(DEFAULT_WS_DRAFT);

	return (
		<div className={s.wrapper}>
			<Header section="ws-client" activeLink="websocket" />

			<div className={s.body}>
				<WsConsole draft={draft} onDraftChange={setDraft} />
			</div>
		</div>
	);
};
