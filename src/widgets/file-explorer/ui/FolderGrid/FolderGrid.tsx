import { type FC, useState } from "react";
import type { Folder } from "@/entities/file-explorer";
import { ChevronIcon, FolderIcon } from "@/shared/icon/icons";
import { cx } from "@/shared/lib/cx";
import { ContextMenu, Dialog } from "@/shared/ui-kit/modal";
import s from "./FolderGrid.module.css";

export const FolderGrid: FC<{
	folders: Folder[];
	onOpen: (id: string) => void;
	/** When provided, each folder shows a delete button; fires after a
	 *  successful delete so the caller can refresh the listing. */
	onDelete?: (folder: Folder) => void | Promise<void>;
}> = ({ folders, onOpen, onDelete }) => {
	const [pending, setPending] = useState<Folder | null>(null);
	const [menu, setMenu] = useState<{
		x: number;
		y: number;
		folder: Folder;
	} | null>(null);

	if (folders.length === 0) return null;
	return (
		<section className={s["fe-section"]}>
			<h2 className={s["fe-section-title"]}>Каталоги</h2>
			<div className={s["fe-folder-grid"]}>
				{folders.map((folder) => (
					<button
						type="button"
						key={folder.id}
						className={s["fe-folder"]}
						onClick={() => onOpen(folder.id)}
						onContextMenu={
							onDelete
								? (e) => {
										e.preventDefault();
										e.stopPropagation();
										setMenu({ x: e.clientX, y: e.clientY, folder });
									}
								: undefined
						}
					>
						<span className={cx(s["fe-tile"], s["fe-tile-folder"])}>
							<FolderIcon />
						</span>
						<span className={s["fe-folder-body"]}>
							<span className={s["fe-folder-name"]} title={folder.name}>
								{folder.name}
							</span>
							<span className={s["fe-folder-count"]}>
								{folder.childrenCount} эл.
							</span>
						</span>
						<span className={s["fe-folder-go"]} aria-hidden="true">
							<ChevronIcon />
						</span>
					</button>
				))}
			</div>

			<ContextMenu.Root
				open={!!menu}
				x={menu?.x ?? 0}
				y={menu?.y ?? 0}
				onClose={() => setMenu(null)}
			>
				<ContextMenu.Item
					danger
					icon={<TrashIcon />}
					onSelect={() => menu && setPending(menu.folder)}
				>
					Удалить каталог
				</ContextMenu.Item>
			</ContextMenu.Root>

			{pending && (
				<DeleteFolderDialog
					folder={pending}
					onClose={() => setPending(null)}
					onConfirm={onDelete}
				/>
			)}
		</section>
	);
};

/* ─── Delete confirmation ─── */
const DeleteFolderDialog: FC<{
	folder: Folder;
	onClose: () => void;
	onConfirm?: (folder: Folder) => void | Promise<void>;
}> = ({ folder, onClose, onConfirm }) => {
	const [deleting, setDeleting] = useState(false);

	const confirm = async () => {
		if (deleting) return;
		setDeleting(true);
		try {
			await onConfirm?.(folder);
			onClose();
		} finally {
			setDeleting(false);
		}
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && !deleting && onClose()}>
			<Dialog.Header>
				<Dialog.Title>Удалить каталог?</Dialog.Title>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<p className={s["fe-delete-text"]}>
					Каталог «{folder.name}» и всё его содержимое будут удалены без
					возможности восстановления.
				</p>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={onClose} disabled={deleting}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnDanger onClick={confirm} disabled={deleting}>
					{deleting ? "Удаляем…" : "Удалить"}
				</Dialog.BtnDanger>
			</Dialog.Footer>
		</Dialog.Root>
	);
};

const TrashIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>delete</title>
		<path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1L11 4M6.5 7v4M9.5 7v4" />
	</svg>
);
