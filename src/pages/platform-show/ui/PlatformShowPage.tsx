import { type FC, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { type Doc, type UpdateDocDTO, useDocsStore } from "@/entities/doc";
import {
	type DirListing,
	type File,
	readDirectoryApi,
} from "@/entities/file-explorer";
import { usePlatformDocs, usePlatformsStore } from "@/entities/platform";
import { DeleteDocModal, EditDocModal } from "@/features/doc";
import {
	actionFetchEnvironmentsPlatform,
	useEnvironmentsStore,
} from "@/features/environment";
import { actionFetchPlatform, usePlatformStore } from "@/features/platform";
import { exportDoc } from "@/pages/docs/lib/exportDoc";
import s from "@/pages/docs/ui/ApiExplorerPage.module.css";
import { Sidebar } from "@/pages/docs/ui/Sidebar";
import { FileGrid } from "@/pages/file-explorer/ui/FileGrid/FileGrid";
import { FolderGrid } from "@/pages/file-explorer/ui/FolderGrid/FolderGrid";
import { useNewMarkdownFile } from "@/pages/file-explorer/ui/useNewMarkdownFile";
import { DropMenu } from "@/shared/ui-kit/controls";
import { Header } from "@/widgets/header";
import b from "./PlatformShowPage.module.css";

const EMPTY_LISTING: DirListing = { folders: [], files: [] };

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview: FC<{ id: string }> = ({ id }) => {
	const { platforms, attachDoc } = usePlatformsStore();
	const { updateDoc } = useDocsStore();
	const { docs, isDocsLoading } = usePlatformDocs(id);
	const [pendingDoc, setPendingDoc] = useState<Doc | null>(null);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [listing, setListing] = useState<DirListing>(EMPTY_LISTING);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	/** Current folder inside the vault: a vault-relative path, "" for the root. */
	const [path, setPath] = useState("");
	const navigate = useNavigate();

	useEffect(() => {
		let cancelled = false;
		readDirectoryApi(path)
			.then((data) => {
				if (!cancelled) setListing(data);
			})
			.catch(() => {
				if (!cancelled) setListing(EMPTY_LISTING);
			});
		return () => {
			cancelled = true;
		};
	}, [path]);

	/** Re-read the current folder after a mutation (e.g. creating a file). */
	const reloadCurrent = () => {
		readDirectoryApi(path)
			.then(setListing)
			.catch(() => setListing(EMPTY_LISTING));
	};

	const { openMenu, element: newFileUi } = useNewMarkdownFile(
		path,
		reloadCurrent,
	);

	const openFolder = (folderId: string) => {
		setSelectedFile(null);
		setPath(folderId);
	};

	/** Double-click a file: `.md` files open in the markdown viewer. */
	const openFile = (file: File) => {
		if (!file.name.toLowerCase().endsWith(".md")) return;
		const fileId = path ? `${path}/${file.name}` : file.name;
		navigate(`/markdown-show?file=${encodeURIComponent(fileId)}`);
	};

	/** Breadcrumb chain: root + each folder segment along the current path. */
	const crumbs: { name: string; id: string }[] = [
		{ name: "Файлы", id: "" },
	];
	{
		let prefix = "";
		for (const segment of path.split("/").filter(Boolean)) {
			prefix = prefix ? `${prefix}/${segment}` : segment;
			crumbs.push({ name: segment, id: prefix });
		}
	}

	const platform = platforms.find((p) => p.id === id);

	const handleSaveEdit = (update: UpdateDocDTO) => {
		updateDoc(update);
		setIsEditOpen(false);
	};

	if (!platform) {
		return (
			<div className={s.overview}>
				<span className={s.ovEyebrow}>Platform</span>
				<h1 className={s.ovTitle}>Платформа не найдена</h1>
			</div>
		);
	}

	return (
		<div className={s.overview} onContextMenu={openMenu}>
			{isDocsLoading ? (
				<p className={s.ovSub}>Загрузка документов…</p>
			) : docs.length === 0 ? (
				<p className={s.ovSub}>В этой платформе пока нет документов</p>
			) : (
				<div className={s.apiCardsGrid}>
					{docs.map((a) => (
						<Link
							to={`/doc-show/${a.id}`}
							key={a.id}
							className={`${s.apiCard}`}
						>
							<div className={s.acAccent} />
							<div className={s.acTop}>
								<div className={s.acName}>{a.name}</div>
								<div
									className={s.acMenuWrap}
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
									}}
								>
									<DropMenu>
										<DropMenu.Trigger>
											<button
												type="button"
												className={s.acMenuBtn}
												aria-label="More options"
												onClick={() => setPendingDoc(a)}
											>
												<svg
													viewBox="0 0 16 16"
													fill="currentColor"
													aria-hidden="true"
												>
													<circle cx="8" cy="3" r="1.4" />
													<circle cx="8" cy="8" r="1.4" />
													<circle cx="8" cy="13" r="1.4" />
												</svg>
											</button>
										</DropMenu.Trigger>
										<DropMenu.Content>
											<DropMenu.Item onClick={() => setIsEditOpen(true)}>
												Edit
											</DropMenu.Item>
											<DropMenu.Item onClick={() => exportDoc(a.id, a.name)}>
												Export
											</DropMenu.Item>
											<DropMenu.Sub>
												<DropMenu.SubTrigger>
													Add to platform
												</DropMenu.SubTrigger>
												<DropMenu.SubContent>
													{platforms.length === 0 ? (
														<DropMenu.Item disabled>No platforms</DropMenu.Item>
													) : (
														platforms.map((p) => (
															<DropMenu.Item
																key={p.id}
																onClick={() =>
																	attachDoc({
																		platformId: p.id,
																		docId: a.id,
																	})
																}
															>
																{p.name}
															</DropMenu.Item>
														))
													)}
												</DropMenu.SubContent>
											</DropMenu.Sub>
											<DropMenu.Separator />
											<DropMenu.Item
												danger
												onClick={() => setIsDeleteOpen(true)}
											>
												Delete
											</DropMenu.Item>
										</DropMenu.Content>
									</DropMenu>
								</div>
							</div>
							<div className={s.acDesc}>{a.desc}</div>
							<div className={s.acFooter}>
								<span className={s.acTag}>service</span>
								{a.tags.map((t) => (
									<span key={t} className={s.acTag}>
										{t}
									</span>
								))}
								<span className={s.acCount}> endpoints →</span>
							</div>
						</Link>
					))}
				</div>
			)}

			{(path !== "" ||
				listing.folders.length > 0 ||
				listing.files.length > 0) && (
				<div className={b.fileBrowser}>
					<h2 className={b.fileBrowserTitle}>Файлы рабочего пространства</h2>
					{path !== "" && (
						<nav className={b.crumbs} aria-label="Путь">
							{crumbs.map((c, i) => (
								<span key={c.id} className={b.crumbItem}>
									{i > 0 && <span className={b.crumbSep}>/</span>}
									{i === crumbs.length - 1 ? (
										<span className={b.crumbCurrent}>{c.name}</span>
									) : (
										<button
											type="button"
											className={b.crumb}
											onClick={() => openFolder(c.id)}
										>
											{c.name}
										</button>
									)}
								</span>
							))}
						</nav>
					)}
					<FolderGrid folders={listing.folders} onOpen={openFolder} />
					<FileGrid
						files={listing.files}
						selectedId={selectedFile?.name ?? null}
						onSelect={setSelectedFile}
						onOpen={openFile}
					/>
				</div>
			)}

			{pendingDoc && (
				<>
					<EditDocModal
						open={isEditOpen}
						onOpenChange={setIsEditOpen}
						doc={pendingDoc}
						onSave={handleSaveEdit}
					/>
					<DeleteDocModal
						open={isDeleteOpen}
						onOpenChange={setIsDeleteOpen}
						doc={pendingDoc}
					/>
				</>
			)}

			{newFileUi}
		</div>
	);
};

/* ═══════════════ MAIN PAGE ═══════════════ */
export const PlatformShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();
	const fetchEnvironments = useEnvironmentsStore(
		actionFetchEnvironmentsPlatform,
	);
	const fetchPlatform = usePlatformStore(actionFetchPlatform);

	if (!id) return null;

	fetchEnvironments(id);
	fetchPlatform(id);

	return (
		<div className={s.wrapper}>
			<Header section="platform" activeLink="docs" />

			<div className={s.shell}>
				<Sidebar />
				<Overview id={id} />
			</div>
		</div>
	);
};
