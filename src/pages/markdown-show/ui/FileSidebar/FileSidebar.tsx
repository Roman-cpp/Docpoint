import { type FC, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { type DirListing, getDirectoryApi } from "@/entities/file-explorer";
import { cx } from "@/shared/lib/cx";
import { ChevronIcon, DocIcon, FolderIcon } from "../icons";
import s from "../MarkdownShowPage.module.css";

const EMPTY_LISTING: DirListing = { folders: [], files: [] };

/** Folder that contains the file at `id` ("" for the vault root). */
const parentFolder = (id: string | null): string => {
	if (!id) return "";
	const slash = id.lastIndexOf("/");
	return slash === -1 ? "" : id.slice(0, slash);
};

const isMarkdown = (name: string) => name.toLowerCase().endsWith(".md");

/* ═══════════════ SIDEBAR (left) ═══════════════
   Browsable file tree: lists the .md files in the current folder and lets
   the reader step into sub-folders to preview their contents. Folders in the
   vault only ever hold .md files, so nothing else is shown. */
export const FileSidebar: FC<{ activeFileId: string | null }> = ({
	activeFileId,
}) => {
	const navigate = useNavigate();
	/** Folder currently being browsed — a vault-relative path, "" for the root. */
	const [dir, setDir] = useState(() => parentFolder(activeFileId));
	const [listing, setListing] = useState<DirListing>(EMPTY_LISTING);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");

	// Follow the opened file into its own folder, so the sidebar always shows
	// the neighbours of the document on screen after a navigation.
	useEffect(() => {
		setDir(parentFolder(activeFileId));
	}, [activeFileId]);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		getDirectoryApi(dir)
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
	}, [dir]);

	/** Breadcrumb chain: Главная + each folder segment along the path. */
	const crumbs = useMemo(() => {
		const chain: { name: string; id: string }[] = [{ name: "Главная", id: "" }];
		let prefix = "";
		for (const segment of dir.split("/").filter(Boolean)) {
			prefix = prefix ? `${prefix}/${segment}` : segment;
			chain.push({ name: segment, id: prefix });
		}
		return chain;
	}, [dir]);

	const { folders, files } = useMemo(() => {
		const q = query.trim().toLowerCase();
		const match = (name: string) => !q || name.toLowerCase().includes(q);
		return {
			folders: listing.folders.filter((f) => match(f.name)),
			files: listing.files.filter((f) => isMarkdown(f.name) && match(f.name)),
		};
	}, [listing, query]);

	const openFile = (name: string) => {
		const id = dir ? `${dir}/${name}` : name;
		navigate(`/markdown-show?file=${encodeURIComponent(id)}`);
	};

	const isEmpty = folders.length === 0 && files.length === 0;

	return (
		<aside className={s.sidebar}>
			<nav className={s.sideCrumbs} aria-label="Путь">
				{crumbs.map((c, i) => (
					<span key={c.id} className={s.sideCrumbItem}>
						{i > 0 && <span className={s.sideCrumbSep}>/</span>}
						{i === crumbs.length - 1 ? (
							<span className={s.sideCrumbCur}>{c.name}</span>
						) : (
							<button
								type="button"
								className={s.sideCrumb}
								onClick={() => setDir(c.id)}
							>
								{c.name}
							</button>
						)}
					</span>
				))}
			</nav>

			<div className={s.sideList}>
				{error && <div className={s.sideEmpty}>{error}</div>}
				{!error && loading && <div className={s.sideEmpty}>Загрузка…</div>}
				{!error && !loading && isEmpty && (
					<div className={s.sideEmpty}>
						{query ? "Ничего не найдено" : "Каталог пуст"}
					</div>
				)}

				{!error &&
					!loading &&
					folders.map((folder) => (
						<button
							type="button"
							key={folder.id}
							className={s.sideRow}
							onClick={() => {
								setQuery("");
								setDir(folder.id);
							}}
						>
							<FolderIcon />
							<span className={s.sideRowName}>{folder.name}</span>
							<span className={s.sideRowMeta}>{folder.childrenCount}</span>
							<ChevronIcon open={false} />
						</button>
					))}

				{!error &&
					!loading &&
					files.map((file) => {
						const id = dir ? `${dir}/${file.name}` : file.name;
						return (
							<button
								type="button"
								key={file.name}
								className={cx(
									s.sideRow,
									id === activeFileId && s.sideRowActive,
								)}
								onClick={() => openFile(file.name)}
							>
								<DocIcon />
								<span className={s.sideRowName}>{file.name}</span>
							</button>
						);
					})}
			</div>
		</aside>
	);
};
