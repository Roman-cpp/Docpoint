import { type FC, useState } from "react";
import {
	useWebsocketMessages,
	type WebsocketMessage,
} from "@/entities/websocket";
import { CreateWebsocketMessageModal } from "../CreateWebsocketMessageModal";
import { EditWebsocketMessageModal } from "../EditWebsocketMessageModal";
import s from "./MessagesPanel.module.css";

interface MessagesPanelProps {
	/** Сокет, которому принадлежат сохранённые кадры. */
	websocketId: string;
	/** Положить выбранный кадр в редактор консоли. */
	onApply: (payload: string) => void;
}

/**
 * Сохранённые примеры кадров документированного сокета: список и модалки
 * создания/редактирования.
 */
export const MessagesPanel: FC<MessagesPanelProps> = ({
	websocketId,
	onApply,
}) => {
	const {
		messages: examples,
		isMessagesLoading,
		createMessageAsync,
		isCreatingMessage,
		updateMessageAsync,
		isUpdatingMessage,
		deleteMessageAsync,
		isDeletingMessage,
	} = useWebsocketMessages(websocketId);

	// `undefined` = modal closed, `null` = creating, object = editing that row.
	const [editing, setEditing] = useState<WebsocketMessage | null | undefined>(
		undefined,
	);

	/* Create (editing === null) or update (editing is a row) an example frame. */
	const submitMessage = async (data: {
		name: string;
		payload: string;
		desc: string;
	}) => {
		try {
			if (editing) {
				await updateMessageAsync({ id: editing.id, ...data });
			} else {
				await createMessageAsync({ websocket_id: websocketId, ...data });
			}
			setEditing(undefined);
		} catch {
			/* error toast handled by the mutation */
		}
	};

	const deleteMessage = async () => {
		if (!editing) return;
		try {
			await deleteMessageAsync(editing.id);
			setEditing(undefined);
		} catch {
			/* error toast handled by the mutation */
		}
	};

	return (
		<aside className={s.sidebar}>
			<div className={s.sidebarHead}>
				<span>Examples</span>
				<button
					type="button"
					className={s.addBtn}
					onClick={() => setEditing(null)}
					title="Добавить сообщение"
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 14 14"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinecap="round"
					>
						<title>Добавить сообщение</title>
						<path d="M7 2.5v9M2.5 7h9" />
					</svg>
				</button>
			</div>

			<div className={s.exampleList}>
				{isMessagesLoading ? (
					<div className={s.emptyExamples}>Загрузка…</div>
				) : examples.length === 0 ? (
					<div className={s.emptyExamples}>
						Пока нет сохранённых сообщений. Нажмите «+», чтобы добавить.
					</div>
				) : (
					examples.map((ex) => (
						<div key={ex.id} className={s.exampleItem}>
							<button
								type="button"
								className={s.exampleMain}
								onClick={() => onApply(ex.payload)}
								title={ex.desc || ex.payload}
							>
								<span className={s.exampleName}>{ex.name}</span>
								<span className={s.examplePreview}>{ex.payload}</span>
							</button>
							<button
								type="button"
								className={s.exampleEdit}
								onClick={() => setEditing(ex)}
								title="Редактировать"
							>
								<svg
									width="13"
									height="13"
									viewBox="0 0 14 14"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.4"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<title>Редактировать</title>
									<path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9z" />
								</svg>
							</button>
						</div>
					))
				)}
			</div>

			<CreateWebsocketMessageModal
				open={editing === null}
				onOpenChange={(o) => !o && setEditing(undefined)}
				onSubmit={submitMessage}
				isSaving={isCreatingMessage}
			/>
			{editing && (
				<EditWebsocketMessageModal
					open
					onOpenChange={(o) => !o && setEditing(undefined)}
					message={editing}
					onSubmit={submitMessage}
					onDelete={deleteMessage}
					isSaving={isUpdatingMessage}
					isDeleting={isDeletingMessage}
				/>
			)}
		</aside>
	);
};
