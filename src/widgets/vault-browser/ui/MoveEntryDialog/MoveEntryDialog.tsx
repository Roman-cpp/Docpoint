import { type FC, useEffect, useState } from "react";
import { toast } from "@/core/toast";
import type { FileScope } from "@/entities/shared/file-scope";
import {
	getDirectoryApi,
	parentPath,
	pathCrumbs,
	type VaultFolder,
} from "@/entities/vault";
import { ChevronRightIcon, FolderIcon } from "@/shared/svg";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./MoveEntryDialog.module.css";

/** Is `folder` the moved folder itself or something inside it? Moving a folder
 *  into its own subtree would detach it, so such targets are not offered. */
const insideMoved = (folder: string, movedPath: string, isFolder: boolean) =>
	isFolder && (folder === movedPath || folder.startsWith(`${movedPath}/`));

/**
 * Folder picker: walks the scope one level at a time instead of loading the
 * whole tree, and moves the entry into the folder currently in view.
 */
export const MoveEntryDialog: FC<{
	scope: FileScope;
	/** Breadcrumb label for the scope root. */
	rootLabel: string;
	entry: { path: string; name: string; kind: "file" | "folder" };
	onClose: () => void;
	onMove: (targetDir: string) => Promise<unknown>;
}> = ({ scope, rootLabel, entry, onClose, onMove }) => {
	/** Folder being browsed as a move target. */
	const [dir, setDir] = useState("");
	const [folders, setFolders] = useState<VaultFolder[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		getDirectoryApi(scope, dir)
			.then((listing) => {
				if (!cancelled) setFolders(listing.folders);
			})
			.catch((err) => {
				if (cancelled) return;
				setFolders([]);
				setError(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [scope, dir]);

	const isFolder = entry.kind === "folder";
	const home = parentPath(entry.path);
	const targets = folders.filter(
		(folder) => !insideMoved(folder.path, entry.path, isFolder),
	);
	const crumbs = pathCrumbs(dir, rootLabel);

	const confirm = async () => {
		if (saving || dir === home) return;
		setSaving(true);
		try {
			await onMove(dir);
			onClose();
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось переместить",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && !saving && onClose()}>
			<Dialog.Header>
				<Dialog.Title>Переместить «{entry.name}»</Dialog.Title>
				<Dialog.Subtitle>
					Откройте каталог, в который нужно перенести, и подтвердите.
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<nav className={s.crumbs} aria-label="Путь">
					{crumbs.map((crumb, i) => (
						<span key={crumb.path} className={s.crumbItem}>
							{i > 0 && <span className={s.crumbSep}>/</span>}
							{i === crumbs.length - 1 ? (
								<span className={s.crumbCurrent}>{crumb.name}</span>
							) : (
								<button
									type="button"
									className={s.crumb}
									onClick={() => setDir(crumb.path)}
								>
									{crumb.name}
								</button>
							)}
						</span>
					))}
				</nav>

				<div className={s.list}>
					{error && <p className={s.empty}>{error}</p>}
					{!error && loading && <p className={s.empty}>Загрузка…</p>}
					{!error && !loading && targets.length === 0 && (
						<p className={s.empty}>Внутри нет каталогов</p>
					)}
					{!error &&
						!loading &&
						targets.map((folder) => (
							<button
								key={folder.path}
								type="button"
								className={s.row}
								onClick={() => setDir(folder.path)}
							>
								<FolderIcon size={16} />
								<span className={s.rowName}>{folder.name}</span>
								<ChevronRightIcon size={12} />
							</button>
						))}
				</div>

				{dir === home && (
					<p className={s.hint}>
						{isFolder ? "Каталог" : "Файл"} уже лежит здесь — выберите другой
						каталог.
					</p>
				)}
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel onClick={onClose} disabled={saving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={confirm} disabled={saving || dir === home}>
					{saving ? "Переносим…" : "Переместить сюда"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
