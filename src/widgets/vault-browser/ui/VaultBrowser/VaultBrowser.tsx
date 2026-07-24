import {
	type FC,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "@/core/toast";
import { type FileScope, scopeKey } from "@/entities/shared/file-scope";
import {
	type DirListing,
	deleteDirectoryApi,
	deleteFileApi,
	EMPTY_LISTING,
	getDirectoryApi,
	isMarkdown,
	pathCrumbs,
	type VaultFile,
	type VaultFolder,
} from "@/entities/vault";
import { FileDropZone, useNewVaultEntry } from "@/features/vault";
import { FileGrid } from "../FileGrid";
import { FolderGrid } from "../FolderGrid";
import s from "./VaultBrowser.module.css";

/** Actions the browser exposes to a caller-supplied header. */
export interface VaultBrowserActions {
	/** Open the "new markdown file" dialog for the folder in view. */
	openCreateFile: () => void;
	/** Re-read the folder in view, e.g. after an external change. */
	reload: () => void;
}

/**
 * Browse and edit the files of one scope: breadcrumbs, folders, files, an OS
 * drop target and the new-file/new-folder context menu.
 *
 * Navigation is entirely scope-relative — the widget never sees, and never
 * needs, the vault's physical layout.
 */
export const VaultBrowser: FC<{
	scope: FileScope;
	/** Breadcrumb label for the scope root. */
	rootLabel?: string;
	/** Open a markdown file; when omitted, files only select, never open. */
	onOpenFile?: (path: string) => void;
	/** Rendered above the listing, wired to the browser's own actions. */
	renderHeader?: (actions: VaultBrowserActions) => ReactNode;
}> = ({ scope, rootLabel = "Файлы", onOpenFile, renderHeader }) => {
	// Scopes are usually built inline (`serviceScope(id)`), so a fresh object
	// arrives on every render. Hold a reference stable across those renders,
	// otherwise every effect below would re-run in a loop.
	const key = scopeKey(scope);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the scope's identity
	const target = useMemo(() => scope, [key]);

	/** Folder in view: a scope-relative path, "" for the scope root. */
	const [path, setPath] = useState("");
	const [listing, setListing] = useState<DirListing>(EMPTY_LISTING);
	const [selected, setSelected] = useState<VaultFile | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Another platform or service means a different tree: start at its root.
	// Adjusted during render rather than in an effect, so the fetch below runs
	// once against the new scope instead of firing at the stale path first.
	const [lastKey, setLastKey] = useState(key);
	if (key !== lastKey) {
		setLastKey(key);
		setPath("");
		setSelected(null);
	}

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		getDirectoryApi(target, path)
			.then((data) => {
				if (!cancelled) setListing(data);
			})
			.catch((err) => {
				if (cancelled) return;
				setListing(EMPTY_LISTING);
				setError(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [target, path]);

	/** Re-read the folder in view after a mutation (no spinner). */
	const reload = useCallback(() => {
		getDirectoryApi(target, path)
			.then(setListing)
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			);
	}, [target, path]);

	const {
		openMenu,
		openCreateFile,
		element: createUi,
	} = useNewVaultEntry(target, path, reload);

	const openFolder = (folderPath: string) => {
		setSelected(null);
		setPath(folderPath);
	};

	const deleteFolder = async (folder: VaultFolder) => {
		try {
			await deleteDirectoryApi(target, folder.path);
			reload();
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось удалить каталог",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const deleteFile = async (file: VaultFile) => {
		try {
			await deleteFileApi(target, file.path);
			if (selected?.path === file.path) setSelected(null);
			reload();
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось удалить файл",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	/** Double-click a file: only `.md` files have a viewer. */
	const openFile = (file: VaultFile) => {
		if (onOpenFile && isMarkdown(file.name)) onOpenFile(file.path);
	};

	const crumbs = pathCrumbs(path, rootLabel);
	const isEmpty = listing.folders.length === 0 && listing.files.length === 0;

	return (
		<div className={s.browser} onContextMenu={openMenu}>
			{renderHeader?.({ openCreateFile, reload })}

			{path !== "" && (
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
									onClick={() => openFolder(crumb.path)}
								>
									{crumb.name}
								</button>
							)}
						</span>
					))}
				</nav>
			)}

			{error && <div className={s.empty}>{error}</div>}
			{!error && loading && <div className={s.empty}>Загрузка…</div>}
			{!error && !loading && isEmpty && (
				<div className={s.empty}>Каталог пуст</div>
			)}

			{!error && !loading && (
				<>
					<FolderGrid
						folders={listing.folders}
						onOpen={openFolder}
						onDelete={deleteFolder}
					/>
					<FileGrid
						files={listing.files}
						selectedId={selected?.path ?? null}
						onSelect={setSelected}
						onOpen={openFile}
						onDelete={deleteFile}
					/>
				</>
			)}

			<FileDropZone scope={target} path={path} onImported={reload} />

			{createUi}
		</div>
	);
};
