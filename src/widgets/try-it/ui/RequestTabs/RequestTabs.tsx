import { type FC, useState } from "react";
import { CopyIcon, PencilIcon, TrashIcon } from "@/shared/svg";
import { ContextMenu } from "@/shared/ui-kit/modal";
import type { RequestDraft } from "../../model/tryIt.types";
import s from "./RequestTabs.module.css";

interface MenuState {
	x: number;
	y: number;
	request: RequestDraft;
}

interface RequestTabsProps {
	requests: RequestDraft[];
	activeId: string | null;
	/** Набор, чьё имя нужно править сразу после создания. */
	renamingId: string | null;
	onRenameHandled: () => void;
	onSelect: (id: string) => void;
	onRename: (id: string, name: string) => void;
	onCreate: () => void;
	onDuplicate: () => void;
	onDelete: (id: string) => void;
}

export const RequestTabs: FC<RequestTabsProps> = ({
	requests,
	activeId,
	renamingId,
	onRenameHandled,
	onSelect,
	onRename,
	onCreate,
	onDuplicate,
	onDelete,
}) => {
	const [editingId, setEditingId] = useState<string | null>(null);
	// null — пользователь ещё ничего не ввёл, в поле стоит текущее имя.
	const [draftName, setDraftName] = useState<string | null>(null);
	const [menu, setMenu] = useState<MenuState | null>(null);

	// Свежесозданный набор сразу открывается на переименование.
	const editing = renamingId ?? editingId;
	const editingName =
		draftName ?? requests.find((r) => r.id === editing)?.name ?? "";

	const startRename = (request: RequestDraft) => {
		setEditingId(request.id);
		setDraftName(null);
	};

	const stopRename = () => {
		setEditingId(null);
		setDraftName(null);
		onRenameHandled();
	};

	// Пустое имя — отказ от правки, набор остаётся с прежним названием.
	const commitRename = () => {
		if (editing && draftName !== null) onRename(editing, draftName);
		stopRename();
	};

	return (
		<div className={s.tabs}>
			<div className={s.tabsList}>
				{requests.map((request) => {
					const isActive = request.id === activeId;
					const isEditing = editing === request.id;

					return (
						// biome-ignore lint/a11y/useSemanticElements: внутри вкладки лежат кнопки переименования/закрытия и поле ввода — вложенные <button> невалидны
						<div
							key={request.id}
							className={`${s.tab}${isActive ? ` ${s.active}` : ""}`}
							role="button"
							tabIndex={0}
							onClick={() => onSelect(request.id)}
							onKeyDown={(e) => {
								if (e.key !== "Enter" && e.key !== " ") return;
								e.preventDefault();
								onSelect(request.id);
							}}
							onDoubleClick={() => startRename(request)}
							onContextMenu={(e) => {
								e.preventDefault();
								onSelect(request.id);
								setMenu({ x: e.clientX, y: e.clientY, request });
							}}
							title={isEditing ? undefined : "Правый клик — действия"}
						>
							{isEditing ? (
								<input
									ref={(el) => {
										if (!el || el === document.activeElement) return;
										el.focus();
										el.select();
									}}
									className={s.tabEdit}
									value={editingName}
									onChange={(e) => setDraftName(e.target.value)}
									onBlur={commitRename}
									onKeyDown={(e) => {
										if (e.key === "Enter") commitRename();
										if (e.key === "Escape") stopRename();
									}}
									onClick={(e) => e.stopPropagation()}
								/>
							) : (
								<>
									<span className={s.tabName}>{request.name}</span>
									{isActive && (
										<button
											type="button"
											className={s.tabIconBtn}
											title="Rename"
											onClick={(e) => {
												e.stopPropagation();
												startRename(request);
											}}
										>
											<PencilIcon title="Переименовать" />
										</button>
									)}
									{requests.length > 1 && (
										<button
											type="button"
											className={s.tabClose}
											title="Delete"
											onClick={(e) => {
												e.stopPropagation();
												onDelete(request.id);
											}}
										>
											×
										</button>
									)}
								</>
							)}
						</div>
					);
				})}
			</div>

			<div className={s.tabsActions}>
				<button
					type="button"
					className={s.tabsAction}
					title="Duplicate current request"
					onClick={onDuplicate}
				>
					⧉
				</button>
				<button
					type="button"
					className={s.tabsAction}
					title="New request"
					onClick={onCreate}
				>
					+
				</button>
			</div>

			<ContextMenu.Root
				open={!!menu}
				x={menu?.x ?? 0}
				y={menu?.y ?? 0}
				onClose={() => setMenu(null)}
			>
				<ContextMenu.Item
					icon={<PencilIcon title="Переименовать" />}
					onSelect={() => menu && startRename(menu.request)}
				>
					Переименовать
				</ContextMenu.Item>

				<ContextMenu.Item
					icon={<CopyIcon title="Дублировать" />}
					onSelect={onDuplicate}
				>
					Дублировать
				</ContextMenu.Item>

				<ContextMenu.Separator />

				<ContextMenu.Item
					danger
					icon={<TrashIcon title="Удалить" />}
					disabled={requests.length <= 1}
					onSelect={() => menu && onDelete(menu.request.id)}
				>
					Удалить
				</ContextMenu.Item>
			</ContextMenu.Root>
		</div>
	);
};
