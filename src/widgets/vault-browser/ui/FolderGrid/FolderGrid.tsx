import { type FC, useState } from "react";
import type { VaultFolder } from "@/entities/vault";
import { cx } from "@/shared/lib/cx";
import {
	ChevronRightIcon,
	FolderIcon,
	MoveIcon,
	PencilIcon,
	TrashIcon,
} from "@/shared/svg";
import { ContextMenu, Dialog } from "@/shared/ui-kit/modal";
import s from "./FolderGrid.module.css";

export const FolderGrid: FC<{
	folders: VaultFolder[];
	onOpen: (path: string) => void;
	/** When provided, each folder shows a delete button; fires after a
	 *  successful delete so the caller can refresh the listing. */
	onDelete?: (folder: VaultFolder) => void | Promise<void>;
	/** Ask the caller to open its rename prompt for this folder. */
	onRename?: (folder: VaultFolder) => void;
	/** Ask the caller to open its move prompt for this folder. */
	onMove?: (folder: VaultFolder) => void;
}> = ({ folders, onOpen, onDelete, onRename, onMove }) => {
	const [pending, setPending] = useState<VaultFolder | null>(null);
	const [menu, setMenu] = useState<{
		x: number;
		y: number;
		folder: VaultFolder;
	} | null>(null);

	if (folders.length === 0) return null;
	return (
		<section className={s["fe-section"]}>
			<h2 className={s["fe-section-title"]}>Каталоги</h2>
			<div className={s["fe-folder-grid"]}>
				{folders.map((folder) => (
					<button
						type="button"
						key={folder.path}
						className={s["fe-folder"]}
						onClick={() => onOpen(folder.path)}
						onContextMenu={
							onDelete || onRename || onMove
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
						</span>
						<span className={s["fe-folder-go"]} aria-hidden="true">
							<ChevronRightIcon />
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
				{onRename && (
					<ContextMenu.Item
						icon={<PencilIcon />}
						onSelect={() => menu && onRename(menu.folder)}
					>
						Переименовать
					</ContextMenu.Item>
				)}

				{onMove && (
					<ContextMenu.Item
						icon={<MoveIcon />}
						onSelect={() => menu && onMove(menu.folder)}
					>
						Переместить…
					</ContextMenu.Item>
				)}

				{(onRename || onMove) && <ContextMenu.Separator />}

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
	folder: VaultFolder;
	onClose: () => void;
	onConfirm?: (folder: VaultFolder) => void | Promise<void>;
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
