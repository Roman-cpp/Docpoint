import { type FC, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "@/core/toast";
import {
	type DirListing,
	deleteDirectoryApi,
	type File,
	type Folder,
	readDirectoryApi,
} from "@/entities/file-explorer";
import { deleteMarkdownApi, useNewMarkdownFile } from "@/entities/markdown";
import { usePlatformsStore } from "@/entities/platform";
import { type Service, usePlatformServices } from "@/entities/service";
import {
	actionFetchEnvironmentsPlatform,
	useEnvironmentsStore,
} from "@/features/environment";
import { actionFetchPlatform, usePlatformStore } from "@/features/platform";
import { ServiceModal } from "@/features/service";
import { Button, FileDropZone } from "@/shared/ui-kit/controls";
import { ContextMenu, Dialog } from "@/shared/ui-kit/modal";
import { FileGrid, FolderGrid } from "@/widgets/file-explorer";
import { Header } from "@/widgets/header";
import { SidebarPlatform } from "@/widgets/sidebar";
import b from "./PlatformShowPage.module.css";

const EMPTY_LISTING: DirListing = { folders: [], files: [] };

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview: FC<{ id: string }> = ({ id }) => {
	const { platforms } = usePlatformsStore();
	const {
		services,
		isServicesLoading,
		createService,
		isCreatingService,
		updateService,
		isUpdatingService,
		deleteServiceAsync,
		isDeletingService,
	} = usePlatformServices(id);
	const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
	const [editingService, setEditingService] = useState<Service | null>(null);
	const [pendingDelete, setPendingDelete] = useState<Service | null>(null);
	const [svcMenu, setSvcMenu] = useState<{
		x: number;
		y: number;
		svc: Service;
	} | null>(null);
	const [listing, setListing] = useState<DirListing>(EMPTY_LISTING);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	/** Current folder inside the vault: a vault-relative path, "" for the root. */
	const [path, setPath] = useState("");
	/** Which section is shown: platform details, microservices, or files. */
	const [tab, setTab] = useState<"details" | "services" | "files">("services");
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
			if (selectedFile?.name === file.name) setSelectedFile(null);
			reloadCurrent();
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось удалить файл",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	/** Double-click a file: `.md` files open in the markdown viewer. */
	const openFile = (file: File) => {
		if (!file.name.toLowerCase().endsWith(".md")) return;
		const fileId = path ? `${path}/${file.name}` : file.name;
		navigate(`/markdown-show?file=${encodeURIComponent(fileId)}`);
	};

	/** Breadcrumb chain: root + each folder segment along the current path. */
	const crumbs: { name: string; id: string }[] = [{ name: "Файлы", id: "" }];
	{
		let prefix = "";
		for (const segment of path.split("/").filter(Boolean)) {
			prefix = prefix ? `${prefix}/${segment}` : segment;
			crumbs.push({ name: segment, id: prefix });
		}
	}

	const platform = platforms.find((p) => p.id === id);

	if (!platform) {
		return (
			<div className={b.overview}>
				<div className={b.content}>
					<header className={b.hero}>
						<div className={b.ovEyebrow}>Платформа</div>
						<h1 className={b.ovTitle}>Платформа не найдена</h1>
					</header>
				</div>
			</div>
		);
	}

	return (
		<div className={b.overview} onContextMenu={openMenu}>
			<div className={b.content}>
				<div className={b.tabs} role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={tab === "details"}
						className={`${b.tab} ${tab === "details" ? b.tabActive : ""}`}
						onClick={() => setTab("details")}
					>
						Подробности
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={tab === "services"}
						className={`${b.tab} ${tab === "services" ? b.tabActive : ""}`}
						onClick={() => setTab("services")}
					>
						Микросервисы
						{services.length > 0 && (
							<span className={b.tabCount}>{services.length}</span>
						)}
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={tab === "files"}
						className={`${b.tab} ${tab === "files" ? b.tabActive : ""}`}
						onClick={() => setTab("files")}
					>
						Файлы платформы
					</button>
				</div>

				{tab === "details" && (
					<section className={b.section}>
						<div className={b.sectionLabel}>
							<span>Подробности о платформе</span>
							<span className={b.sectionRule} />
						</div>
						{platform.desc ? (
							<p className={b.detailsDesc}>{platform.desc}</p>
						) : (
							<p className={b.ovSub}>Описание платформы не задано</p>
						)}
						<dl className={b.metaGrid}>
							<div className={b.metaRow}>
								<dt className={b.metaKey}>Название</dt>
								<dd className={b.metaVal}>{platform.name}</dd>
							</div>
							<div className={b.metaRow}>
								<dt className={b.metaKey}>Микросервисов</dt>
								<dd className={b.metaVal}>{services.length}</dd>
							</div>
						</dl>
					</section>
				)}

				{tab === "services" && (
					<section className={b.section}>
						<div className={b.sectionHead}>
							<div className={b.sectionLabel}>
								<span>Микросервисы</span>
								{services.length > 0 && (
									<span className={b.sectionCount}>{services.length}</span>
								)}
								<span className={b.sectionRule} />
							</div>
							<Button
								variant="subtle"
								size="sm"
								onClick={() => setIsServiceModalOpen(true)}
							>
								+ Добавить
							</Button>
						</div>
						{isServicesLoading ? (
							<p className={b.ovSub}>Загрузка микросервисов…</p>
						) : services.length === 0 ? (
							<div className={b.emptyState}>
								<p className={b.emptyText}>
									К этой платформе пока не прикреплён ни один микросервис
								</p>
								<Button
									variant="primary"
									size="sm"
									onClick={() => setIsServiceModalOpen(true)}
								>
									+ Добавить микросервис
								</Button>
							</div>
						) : (
							<div className={b.apiCardsGrid}>
								{services.map((svc) => (
									<button
										type="button"
										key={svc.id}
										className={`${b.apiCard} ${b.svcCard}`}
										onClick={() => navigate(`/service-show/${svc.id}`)}
										onContextMenu={(e) => {
											e.preventDefault();
											e.stopPropagation();
											setSvcMenu({ x: e.clientX, y: e.clientY, svc });
										}}
									>
										<div className={b.acName}>{svc.name}</div>
										{svc.desc && <div className={b.acDesc}>{svc.desc}</div>}
									</button>
								))}
							</div>
						)}
					</section>
				)}

				{tab === "files" && (
					<div className={b.fileBrowser}>
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
						<FolderGrid
							folders={listing.folders}
							onOpen={openFolder}
							onDelete={deleteFolder}
						/>
						<FileGrid
							files={listing.files}
							selectedId={selectedFile?.name ?? null}
							onSelect={setSelectedFile}
							onOpen={openFile}
							onDelete={deleteFile}
						/>
						<FileDropZone folder={path} onImported={reloadCurrent} />
					</div>
				)}
			</div>

			<ServiceModal
				open={isServiceModalOpen || editingService != null}
				onOpenChange={(open) => {
					if (open) return;
					setIsServiceModalOpen(false);
					setEditingService(null);
				}}
				platformId={id}
				service={editingService}
				onCreate={(dto) =>
					createService(dto, { onSuccess: () => setIsServiceModalOpen(false) })
				}
				onUpdate={(dto) =>
					updateService(dto, { onSuccess: () => setEditingService(null) })
				}
				isSaving={editingService ? isUpdatingService : isCreatingService}
			/>

			<ContextMenu.Root
				open={!!svcMenu}
				x={svcMenu?.x ?? 0}
				y={svcMenu?.y ?? 0}
				onClose={() => setSvcMenu(null)}
			>
				<ContextMenu.Item
					icon={<PencilIcon />}
					onSelect={() => svcMenu && setEditingService(svcMenu.svc)}
				>
					Редактировать
				</ContextMenu.Item>

				<ContextMenu.Separator />

				<ContextMenu.Item
					danger
					icon={<TrashIcon />}
					onSelect={() => svcMenu && setPendingDelete(svcMenu.svc)}
				>
					Удалить микросервис
				</ContextMenu.Item>
			</ContextMenu.Root>

			{pendingDelete && (
				<Dialog.Root
					open
					onOpenChange={(open) =>
						!open && !isDeletingService && setPendingDelete(null)
					}
				>
					<Dialog.Header>
						<Dialog.Title>Удалить микросервис?</Dialog.Title>
						<Dialog.Close />
					</Dialog.Header>
					<Dialog.Body>
						<p className={b.ovSub} style={{ margin: 0 }}>
							Микросервис «{pendingDelete.name}» будет удалён без возможности
							восстановления.
						</p>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.BtnCancel
							onClick={() => setPendingDelete(null)}
							disabled={isDeletingService}
						>
							Отмена
						</Dialog.BtnCancel>
						<Dialog.BtnDanger
							onClick={async () => {
								if (isDeletingService) return;
								try {
									await deleteServiceAsync(pendingDelete.id);
									setPendingDelete(null);
								} catch {
									/* error toast handled by the mutation */
								}
							}}
							disabled={isDeletingService}
						>
							{isDeletingService ? "Удаляем…" : "Удалить"}
						</Dialog.BtnDanger>
					</Dialog.Footer>
				</Dialog.Root>
			)}

			{newFileUi}
		</div>
	);
};

const PencilIcon: FC = () => (
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
		<title>edit</title>
		<path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z" />
	</svg>
);

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
		<div className={b.wrapper}>
			<Header section="platform" activeLink="docs" />

			<div className={b.shell}>
				<SidebarPlatform />
				<Overview id={id} />
			</div>
		</div>
	);
};
