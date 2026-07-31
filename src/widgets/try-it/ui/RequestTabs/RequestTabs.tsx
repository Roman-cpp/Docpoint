import { type FC, useState } from "react";
import { ContextMenu } from "@/shared/ui-kit/modal";
import type { RequestDraft } from "../../model/tryIt.types";
import s from "./RequestTabs.module.css";

const PencilIcon = () => (
	<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
		<title>Переименовать</title>
		<path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9l6.5-6.5z" strokeLinejoin="round" />
	</svg>
);

const CopyIcon = () => (
	<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
		<title>Дублировать</title>
		<rect x="5" y="5" width="7" height="7" rx="1.5" />
		<path d="M9 5V3.5A1.5 1.5 0 007.5 2H3.5A1.5 1.5 0 002 3.5v4A1.5 1.5 0 003.5 9H5" />
	</svg>
);

const TrashIcon = () => (
	<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
		<title>Удалить</title>
		<path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.5 7.5h5L10 4" strokeLinejoin="round" />
	</svg>
);

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
						<div
							key={request.id}
							className={`${s.tab}${isActive ? ` ${s.active}` : ""}`}
							onClick={() => onSelect(request.id)}
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
											<PencilIcon />
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
					icon={<PencilIcon />}
					onSelect={() => menu && startRename(menu.request)}
				>
					Переименовать
				</ContextMenu.Item>

				<ContextMenu.Item icon={<CopyIcon />} onSelect={onDuplicate}>
					Дублировать
				</ContextMenu.Item>

				<ContextMenu.Separator />

				<ContextMenu.Item
					danger
					icon={<TrashIcon />}
					disabled={requests.length <= 1}
					onSelect={() => menu && onDelete(menu.request.id)}
				>
					Удалить
				</ContextMenu.Item>
			</ContextMenu.Root>
		</div>
	);
};
