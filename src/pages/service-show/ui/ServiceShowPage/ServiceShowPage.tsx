import { useQueryClient } from "@tanstack/react-query";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type FC, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "@/core/toast";
import { type Doc, type UpdateDocDTO, useDocsStore } from "@/entities/doc-api";
import { useServiceErds } from "@/entities/doc-erd";
import { useAllServices, useAttachDoc } from "@/entities/service";
import { serviceScope } from "@/entities/shared/file-scope";
import { markdownRoute } from "@/entities/vault";
import type { DocWebsocket } from "@/entities/websocket";
import { useServiceWebsockets } from "@/entities/websocket";
import {
	EditDocApiModal,
	exportDoc,
	type ImportDocPayload,
	useImportExportDoc,
} from "@/features/doc-api";
import { CreateDocApiModal } from "@/features/doc-api/create-doc-api";
import { serviceDocsKeys, useServiceDocs } from "@/features/service";
import s from "@/pages/docs/ui/ApiExplorerPage.module.css";
import { Button } from "@/shared/ui-kit/controls";
import { ContextMenu, Dialog } from "@/shared/ui-kit/modal";
import { Header } from "@/widgets/header";
import { SidebarPlatform } from "@/widgets/sidebar";
import { VaultBrowser } from "@/widgets/vault-browser";
import { CreateErdModal } from "../CreateErdModal";
import { CreateWebsocketModal } from "../CreateWebsocketModal";
import { EditWebsocketModal } from "../EditWebsocketModal";

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview: FC<{ id: string }> = ({ id }) => {
	const { services, isServicesLoading } = useAllServices();
	const { docs, isDocsLoading } = useServiceDocs(id);
	const { erds, isErdsLoading, createErdAsync, isCreatingErd } =
		useServiceErds(id);
	const {
		websockets,
		isWebsocketsLoading,
		createWebsocketAsync,
		isCreatingWebsocket,
		updateWebsocketAsync,
		isUpdatingWebsocket,
	} = useServiceWebsockets(id);
	const {
		createDocAsync,
		deleteDocAsync,
		isCreating,
		isDeleting,
		isUpdating,
		updateDocAsync,
	} = useDocsStore();
	const { importDocAsync, isImporting } = useImportExportDoc();
	const { attachDocAsync, isAttaching } = useAttachDoc();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [docMenu, setDocMenu] = useState<{
		x: number;
		y: number;
		doc: Doc;
	} | null>(null);
	const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);
	const [pendingEdit, setPendingEdit] = useState<Doc | null>(null);
	const [erdModalOpen, setErdModalOpen] = useState(false);
	const [docModalOpen, setDocModalOpen] = useState(false);
	const [wsModalOpen, setWsModalOpen] = useState(false);
	const [wsMenu, setWsMenu] = useState<{
		x: number;
		y: number;
		ws: DocWebsocket;
	} | null>(null);
	const [pendingWsEdit, setPendingWsEdit] = useState<DocWebsocket | null>(null);
	const importInputRef = useRef<HTMLInputElement>(null);

	/** Read a previously exported doc JSON, import it, and immediately attach the
	 *  new doc to this microservice so it appears under "Прикреплённые документы". */
	const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		// Reset the input so picking the same file again still fires onChange.
		e.target.value = "";
		if (!file) return;
		try {
			const payload = JSON.parse(await file.text()) as ImportDocPayload;
			const docId = await importDocAsync(payload);
			await attachDocAsync({ serviceId: id, docId });
			queryClient.invalidateQueries({
				queryKey: serviceDocsKeys.byService(id),
			});
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось импортировать документ",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	/** Export a doc to JSON, in the same format handleImportFile accepts. */
	const handleExportDoc = async (doc: Doc) => {
		try {
			await exportDoc(doc.id, doc.name);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось экспортировать документ",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	/** Open a doc in a separate native window. Reuses/focuses an existing
	 *  window for the same doc instead of erroring on the duplicate label. */
	const openDocInNewWindow = async (doc: Doc) => {
		const label = `doc-show-${doc.id}`;
		const existing = await WebviewWindow.getByLabel(label);
		if (existing) {
			await existing.setFocus();
			return;
		}
		const win = new WebviewWindow(label, {
			url: `/doc-show/${doc.id}`,
			title: doc.name,
			width: 1100,
			height: 760,
		});
		win.once("tauri://error", (e) => {
			toast({
				variant: "error",
				title: "Не удалось открыть окно",
				description: String(e.payload),
			});
		});
	};

	const service = services.find((svc) => svc.id === id);

	if (isServicesLoading && !service) {
		return (
			<div className={s.overview}>
				<p className={s.ovSub}>Загрузка микросервиса…</p>
			</div>
		);
	}

	if (!service) {
		return (
			<div className={s.overview}>
				<span className={s.ovEyebrow}>Microservice</span>
				<h1 className={s.ovTitle}>Микросервис не найден</h1>
			</div>
		);
	}

	return (
		<div className={s.overview}>
			<Link className={s.ovSub} to={`/platform-show/${service.platformId}`}>
				← К платформе
			</Link>

			<div style={{ marginTop: 24 }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 16,
					}}
				>
					<h2 className={s.ovTitle} style={{ fontSize: 18, margin: 0 }}>
						Прикреплённые документы
					</h2>
					<div style={{ display: "flex", gap: 8 }}>
						<Button
							variant="subtle"
							disabled={isImporting || isAttaching}
							onClick={() => importInputRef.current?.click()}
						>
							{isImporting ? "Импорт…" : "↓ Импортировать"}
						</Button>
						<Button variant="subtle" onClick={() => setDocModalOpen(true)}>
							+ Создать документ
						</Button>
					</div>
					<input
						ref={importInputRef}
						type="file"
						accept="application/json,.json"
						style={{ display: "none" }}
						onChange={handleImportFile}
					/>
				</div>
				{isDocsLoading ? (
					<p className={s.ovSub}>Загрузка документов…</p>
				) : docs.length === 0 ? (
					<p className={s.ovSub}>
						К этому микросервису пока не прикреплён ни один документ
					</p>
				) : (
					<div className={s.apiCardsGrid}>
						{docs.map((doc) => (
							<Link
								to={`/doc-show/${doc.id}`}
								key={doc.id}
								className={s.apiCard}
								// Carry the originating service so the doc page can offer a
								// "back to service" link.
								state={{ serviceId: id, serviceName: service.name }}
								onContextMenu={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setDocMenu({ x: e.clientX, y: e.clientY, doc });
								}}
							>
								<div className={s.acAccent} />
								<div className={s.acTop}>
									<div className={s.acName}>{doc.name}</div>
								</div>
								<div className={s.acDesc}>{doc.desc}</div>
								<div className={s.acFooter}>
									<span className={s.acTag}>doc</span>
									{doc.tags.map((t) => (
										<span key={t} className={s.acTag}>
											{t}
										</span>
									))}
								</div>
							</Link>
						))}
					</div>
				)}
			</div>

			<div style={{ marginTop: 32 }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 16,
					}}
				>
					<h2 className={s.ovTitle} style={{ fontSize: 18, margin: 0 }}>
						ERD-диаграммы
					</h2>
					<Button variant="subtle" onClick={() => setErdModalOpen(true)}>
						+ Создать ERD
					</Button>
				</div>
				{isErdsLoading ? (
					<p className={s.ovSub}>Загрузка диаграмм…</p>
				) : erds.length === 0 ? (
					<p className={s.ovSub}>
						К этому микросервису пока не прикреплена ни одна ERD-диаграмма
					</p>
				) : (
					<div className={s.apiCardsGrid}>
						{erds.map((erd) => (
							<Link
								to={`/doc-erd-show/${erd.id}`}
								key={erd.id}
								className={s.apiCard}
								// Carry the originating service so the ERD page can offer a
								// "back to service" link.
								state={{ serviceId: id, serviceName: service.name }}
							>
								<div className={s.acAccent} />
								<div className={s.acTop}>
									<div className={s.acName}>{erd.name}</div>
								</div>
								<div className={s.acDesc}>{erd.desc}</div>
								<div className={s.acFooter}>
									<span className={s.acTag}>erd</span>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>

			<div style={{ marginTop: 32 }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 16,
					}}
				>
					<h2 className={s.ovTitle} style={{ fontSize: 18, margin: 0 }}>
						Прикреплённые WebSocket
					</h2>
					<Button variant="subtle" onClick={() => setWsModalOpen(true)}>
						+ Создать WS
					</Button>
				</div>
				{isWebsocketsLoading ? (
					<p className={s.ovSub}>Загрузка WebSocket…</p>
				) : websockets.length === 0 ? (
					<p className={s.ovSub}>
						К этому микросервису пока не прикреплён ни один WebSocket
					</p>
				) : (
					<div className={s.apiCardsGrid}>
						{websockets.map((ws) => (
							<Link
								to="/websocket"
								key={ws.id}
								className={s.apiCard}
								// Carry the socket's id and URL so the tester page can prefill
								// the connection and load its saved example messages.
								state={{ id: ws.id, url: ws.url, name: ws.name }}
								onContextMenu={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setWsMenu({ x: e.clientX, y: e.clientY, ws });
								}}
							>
								<div className={s.acAccent} />
								<div className={s.acTop}>
									<div className={s.acName}>{ws.name}</div>
								</div>
								<div className={s.acDesc}>{ws.desc || ws.url}</div>
								<div className={s.acFooter}>
									<span className={s.acTag}>ws</span>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>

			<div style={{ marginTop: 32 }}>
				<VaultBrowser
					scope={serviceScope(id)}
					rootLabel="Файлы микросервиса"
					onOpenFile={(filePath) =>
						navigate(markdownRoute(serviceScope(id), filePath))
					}
					renderHeader={({ openCreateFile }) => (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<h2 className={s.ovTitle} style={{ fontSize: 18, margin: 0 }}>
								Файлы микросервиса
							</h2>
							<Button variant="subtle" onClick={openCreateFile}>
								+ Создать MD
							</Button>
						</div>
					)}
				/>
			</div>

			<CreateDocApiModal
				open={docModalOpen}
				onOpenChange={setDocModalOpen}
				isCreating={isCreating || isAttaching}
				onCreate={async (dto) => {
					try {
						// Create the doc, then attach it to this microservice so it
						// shows up under "Прикреплённые документы" right away.
						const docId = await createDocAsync(dto);
						await attachDocAsync({ serviceId: id, docId });
						queryClient.invalidateQueries({
							queryKey: serviceDocsKeys.byService(id),
						});
						setDocModalOpen(false);
					} catch {
						/* error toast handled by the mutation */
					}
				}}
			/>

			<CreateErdModal
				open={erdModalOpen}
				onOpenChange={setErdModalOpen}
				isSaving={isCreatingErd}
				onCreate={async ({ name, desc }) => {
					try {
						await createErdAsync({ name, desc, service_id: id });
						setErdModalOpen(false);
					} catch {
						/* error toast handled by the mutation */
					}
				}}
			/>

			<CreateWebsocketModal
				open={wsModalOpen}
				onOpenChange={setWsModalOpen}
				isSaving={isCreatingWebsocket}
				onCreate={async ({ name, desc, url }) => {
					try {
						await createWebsocketAsync({ name, desc, url, service_id: id });
						setWsModalOpen(false);
					} catch {
						/* error toast handled by the mutation */
					}
				}}
			/>

			<ContextMenu.Root
				open={!!wsMenu}
				x={wsMenu?.x ?? 0}
				y={wsMenu?.y ?? 0}
				onClose={() => setWsMenu(null)}
			>
				<ContextMenu.Item
					icon={<PencilIcon />}
					onSelect={() => wsMenu && setPendingWsEdit(wsMenu.ws)}
				>
					Редактировать
				</ContextMenu.Item>
			</ContextMenu.Root>

			{pendingWsEdit && (
				<EditWebsocketModal
					open
					onOpenChange={(open) =>
						!open && !isUpdatingWebsocket && setPendingWsEdit(null)
					}
					websocket={pendingWsEdit}
					isSaving={isUpdatingWebsocket}
					onSave={async (updates) => {
						try {
							await updateWebsocketAsync(updates);
							setPendingWsEdit(null);
						} catch {
							/* error toast handled by the mutation */
						}
					}}
				/>
			)}

			<ContextMenu.Root
				open={!!docMenu}
				x={docMenu?.x ?? 0}
				y={docMenu?.y ?? 0}
				onClose={() => setDocMenu(null)}
			>
				<ContextMenu.Item
					icon={<EyeIcon />}
					onSelect={() => {
						if (!docMenu) return;
						navigate(`/doc-show/${docMenu.doc.id}`, {
							state: { serviceId: id, serviceName: service.name },
						});
					}}
				>
					Открыть
				</ContextMenu.Item>

				<ContextMenu.Item
					icon={<NewWindowIcon />}
					onSelect={() => docMenu && openDocInNewWindow(docMenu.doc)}
				>
					Открыть в новом окне
				</ContextMenu.Item>

				<ContextMenu.Item
					icon={<PencilIcon />}
					onSelect={() => docMenu && setPendingEdit(docMenu.doc)}
				>
					Редактировать
				</ContextMenu.Item>

				<ContextMenu.Item
					icon={<DownloadIcon />}
					onSelect={() => docMenu && handleExportDoc(docMenu.doc)}
				>
					Экспортировать
				</ContextMenu.Item>

				<ContextMenu.Separator />

				<ContextMenu.Item
					danger
					icon={<TrashIcon />}
					onSelect={() => docMenu && setPendingDelete(docMenu.doc)}
				>
					Удалить документ
				</ContextMenu.Item>
			</ContextMenu.Root>

			{pendingEdit && (
				<EditDocApiModal
					open
					onOpenChange={(open) => !open && !isUpdating && setPendingEdit(null)}
					doc={pendingEdit}
					isSaving={isUpdating}
					onSave={async (updates: UpdateDocDTO) => {
						try {
							await updateDocAsync(updates);

							queryClient.invalidateQueries({
								queryKey: serviceDocsKeys.byService(id),
							});

							setPendingEdit(null);
						} catch {
							/* error toast handled by the mutation */
						}
					}}
				/>
			)}

			{pendingDelete && (
				<Dialog.Root
					open
					onOpenChange={(open) =>
						!open && !isDeleting && setPendingDelete(null)
					}
				>
					<Dialog.Header>
						<Dialog.Title>Удалить документ?</Dialog.Title>
						<Dialog.Close />
					</Dialog.Header>
					<Dialog.Body>
						<p className={s.ovSub} style={{ margin: 0 }}>
							Документ «{pendingDelete.name}» будет удалён без возможности
							восстановления.
						</p>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.BtnCancel
							onClick={() => setPendingDelete(null)}
							disabled={isDeleting}
						>
							Отмена
						</Dialog.BtnCancel>
						<Dialog.BtnDanger
							onClick={async () => {
								if (isDeleting) return;
								try {
									await deleteDocAsync(pendingDelete.id);
									queryClient.invalidateQueries({
										queryKey: serviceDocsKeys.byService(id),
									});
									setPendingDelete(null);
								} catch {
									/* error toast handled by the mutation */
								}
							}}
							disabled={isDeleting}
						>
							{isDeleting ? "Удаляем…" : "Удалить"}
						</Dialog.BtnDanger>
					</Dialog.Footer>
				</Dialog.Root>
			)}
		</div>
	);
};

const EyeIcon: FC = () => (
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
		<title>open</title>
		<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z" />
		<circle cx="8" cy="8" r="2" />
	</svg>
);

const NewWindowIcon: FC = () => (
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
		<title>open in new window</title>
		<path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5" />
		<path d="M12 9.5v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3" />
	</svg>
);

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

		<path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z" />
	</svg>
);

const DownloadIcon: FC = () => (
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
		<title>export</title>
		<path d="M8 1.5v8.5M4.5 6.5 8 10l3.5-3.5" />
		<path d="M2.5 12.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
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
export const ServiceShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();

	if (!id) return null;

	return (
		<div className={s.wrapper}>
			<Header section="platform" activeLink="docs" />

			<div className={s.shell}>
				<SidebarPlatform />
				<Overview id={id} />
			</div>
		</div>
	);
};
