import { type FC, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "@/core/toast";
import {
	type DirListing,
	deleteDirectoryApi,
	deleteMarkdownApi,
	type File,
	type Folder,
	readDirectoryApi,
} from "@/entities/file-explorer";
import { cx } from "@/shared/lib/cx";
import { Header } from "@/widgets/header";
import { CloseIcon, FileIcon, SearchIcon } from "../../../shared/icon/icons";
import { FileDropZone } from "./FileDropZone/FileDropZone";
import s from "./FileExplorerPage.module.css";
import { FileGrid } from "./FileGrid/FileGrid";
import { FolderGrid } from "./FolderGrid/FolderGrid";
import { formatSize, KIND_LABEL } from "./lib";
import { useNewMarkdownFile } from "./useNewMarkdownFile";

const EMPTY_LISTING: DirListing = { folders: [], files: [] };

/* ─── Page ─── */
export const FileExplorerPage: FC = () => {
	/** Current folder id: a vault-relative path, "" for the vault root. */
	const [path, setPath] = useState("");
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<File | null>(null);
	const [listing, setListing] = useState<DirListing>(EMPTY_LISTING);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		readDirectoryApi(path)
			.then((data) => {
				if (!cancelled) setListing(data);
			})
			.catch((err) => {
				if (!cancelled) {
					setListing(EMPTY_LISTING);
					setError(String(err));
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [path]);

	/** Re-read the current folder after a mutation (best-effort, no spinner). */
	const reloadCurrent = () => {
		readDirectoryApi(path)
			.then(setListing)
			.catch((err) => setError(String(err)));
	};

	const { openMenu, element: newFileUi } = useNewMarkdownFile(
		path,
		reloadCurrent,
	);

	const deleteFolder = async (folder: Folder) => {
		try {
			await deleteDirectoryApi(folder.id);
			reloadCurrent();
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось удалить каталог",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const deleteFile = async (file: File) => {
		try {
			await deleteMarkdownApi(path ? `${path}/${file.name}` : file.name);
			if (selected?.name === file.name) setSelected(null);
			reloadCurrent();
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось удалить файл",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	/** Breadcrumb chain: Главная + each folder segment along the path. */
	const crumbs = useMemo(() => {
		const chain: { name: string; id: string }[] = [{ name: "Главная", id: "" }];
		const segments = path.split("/").filter(Boolean);
		let prefix = "";
		for (const segment of segments) {
			prefix = prefix ? `${prefix}/${segment}` : segment;
			chain.push({ name: segment, id: prefix });
		}
		return chain;
	}, [path]);

	const { folders, files } = useMemo(() => {
		const q = search.trim().toLowerCase();
		const match = (name: string) => !q || name.toLowerCase().includes(q);
		return {
			folders: listing.folders.filter((f) => match(f.name)),
			files: listing.files.filter((f) => match(f.name)),
		};
	}, [listing, search]);

	const openFolder = (id: string) => {
		setSelected(null);
		setSearch("");
		setPath(id);
	};

	/** Double-click a file: `.md` files open in the markdown viewer. */
	const openFile = (file: File) => {
		if (!file.name.toLowerCase().endsWith(".md")) return;
		const fileId = path ? `${path}/${file.name}` : file.name;
		navigate(`/markdown-show?file=${encodeURIComponent(fileId)}`);
	};

	const goTo = (id: string) => {
		setSelected(null);
		setSearch("");
		setPath(id);
	};

	const isEmpty = folders.length === 0 && files.length === 0;

	return (
		<div className={s["fe-frame"]}>
			<Header section="Файлы" activeLink="file-explorer" />

			<main className={s["fe-page"]}>
				<div className={s["fe-page-inner"]} onContextMenu={openMenu}>
					{/* Toolbar */}
					<div className={s["fe-toolbar"]}>
						<div className={s["fe-toolbar-row"]}>
							<nav className={s["fe-crumbs"]} aria-label="Путь">
								{crumbs.map((c, i) => (
									<span key={c.id} className={s["fe-crumb-item"]}>
										{i > 0 && <span className={s["fe-crumb-sep"]}>/</span>}
										{i === crumbs.length - 1 ? (
											<span className={s["fe-crumb-current"]}>{c.name}</span>
										) : (
											<button
												type="button"
												className={s["fe-crumb"]}
												onClick={() => goTo(c.id)}
											>
												{c.name}
											</button>
										)}
									</span>
								))}
							</nav>

							<label className={s["fe-search"]}>
								<SearchIcon />
								<input
									type="text"
									placeholder="Поиск в этом каталоге…"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
							</label>
						</div>
						<p className={s["fe-subtitle"]}>
							Каталоги и файлы рабочего пространства. Откройте каталог, чтобы
							перейти внутрь, или файл — чтобы посмотреть его данные.
						</p>
					</div>

					<FileDropZone folder={path} onImported={reloadCurrent} />

					{error && <div className={s["fe-empty"]}>{error}</div>}

					{!error && loading && <div className={s["fe-empty"]}>Загрузка…</div>}

					{!error && !loading && isEmpty && (
						<div className={s["fe-empty"]}>
							{search ? "Ничего не найдено" : "Каталог пуст"}
						</div>
					)}

					{!error && !loading && (
						<>
							<FolderGrid
								folders={folders}
								onOpen={openFolder}
								onDelete={deleteFolder}
							/>

							<FileGrid
								files={files}
								selectedId={selected?.name ?? null}
								onSelect={setSelected}
								onOpen={openFile}
								onDelete={deleteFile}
							/>
						</>
					)}
				</div>
			</main>

			{selected && (
				<FileDrawer file={selected} onClose={() => setSelected(null)} />
			)}

			{newFileUi}
		</div>
	);
};

/* ─── File detail / preview drawer ─── */
const FileDrawer: FC<{ file: File; onClose: () => void }> = ({
	file,
	onClose,
}) => (
	<>
		<button
			type="button"
			className={s["fe-backdrop"]}
			aria-label="Закрыть"
			onClick={onClose}
		/>
		<aside className={s["fe-drawer"]}>
			<div className={s["fe-drawer-head"]}>
				<span className={cx(s["fe-tile"], s["fe-tile-doc"])}>
					<FileIcon kind="doc" />
				</span>
				<div className={s["fe-drawer-titles"]}>
					<h3 className={s["fe-drawer-name"]} title={file.name}>
						{file.name}
					</h3>
					<span className={s["fe-drawer-kind"]}>{KIND_LABEL.doc}</span>
				</div>
				<button
					type="button"
					className={s["fe-drawer-close"]}
					onClick={onClose}
				>
					<CloseIcon />
				</button>
			</div>

			<dl className={s["fe-meta"]}>
				<div className={s["fe-meta-row"]}>
					<dt>Размер</dt>
					<dd>{formatSize(file.size)}</dd>
				</div>
				<div className={s["fe-meta-row"]}>
					<dt>Тип</dt>
					<dd>{KIND_LABEL.doc}</dd>
				</div>
			</dl>

			<div className={s["fe-preview"]}>
				<span className={s["fe-preview-label"]}>Просмотр</span>
				<div className={s["fe-preview-empty"]}>
					Предпросмотр для этого типа недоступен
				</div>
			</div>
		</aside>
	</>
);
