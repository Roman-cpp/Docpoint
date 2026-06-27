import { useQueryClient } from "@tanstack/react-query";
import { type FC, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { type Doc, useDocsStore } from "@/entities/doc";
import { useServiceErds } from "@/entities/doc-erd";
import {
	serviceKeys,
	useAllServices,
	useAttachDoc,
	useServiceDocs,
} from "@/entities/service";
import { CreateDocModal } from "@/features/doc/create-doc";
import s from "@/pages/docs/ui/ApiExplorerPage.module.css";
import { Sidebar } from "@/pages/docs/ui/Sidebar";
import b from "@/pages/platform-show/ui/PlatformShowPage.module.css";
import { Button } from "@/shared/ui-kit/controls";
import { Modal, ModalBtnCancel, ModalBtnDanger } from "@/shared/ui-kit/modal";
import { Header } from "@/widgets/header";
import { CreateErdModal } from "./CreateErdModal";

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview: FC<{ id: string }> = ({ id }) => {
	const { services, isServicesLoading } = useAllServices();
	const { docs, isDocsLoading } = useServiceDocs(id);
	const { erds, isErdsLoading, createErdAsync, isCreatingErd } =
		useServiceErds(id);
	const { createDocAsync, deleteDocAsync, isCreating, isDeleting } =
		useDocsStore();
	const { attachDocAsync, isAttaching } = useAttachDoc();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [docMenu, setDocMenu] = useState<{
		x: number;
		y: number;
		doc: Doc;
	} | null>(null);
	const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);
	const [erdModalOpen, setErdModalOpen] = useState(false);
	const [docModalOpen, setDocModalOpen] = useState(false);

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
			{service.platform_id && (
				<Link className={s.ovSub} to={`/platform-show/${service.platform_id}`}>
					← К платформе
				</Link>
			)}

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
					<Button variant="subtle" onClick={() => setDocModalOpen(true)}>
						+ Создать документ
					</Button>
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

			<CreateDocModal
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
							queryKey: serviceKeys.docs(id),
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

			{docMenu && (
				<>
					<button
						type="button"
						className={b.svcMenuBackdrop}
						aria-label="Закрыть меню"
						onClick={() => setDocMenu(null)}
						onContextMenu={(e) => {
							e.preventDefault();
							setDocMenu(null);
						}}
					/>
					<div
						className={b.svcMenu}
						style={{ left: docMenu.x, top: docMenu.y }}
						role="menu"
					>
						<button
							type="button"
							className={b.svcMenuItem}
							role="menuitem"
							onClick={() => {
								navigate(`/doc-show/${docMenu.doc.id}`, {
									state: { serviceId: id, serviceName: service.name },
								});
								setDocMenu(null);
							}}
						>
							<EyeIcon />
							Открыть
						</button>
						<button
							type="button"
							className={b.svcMenuItem}
							role="menuitem"
							onClick={() => {
								setPendingDelete(docMenu.doc);
								setDocMenu(null);
							}}
						>
							<TrashIcon />
							Удалить документ
						</button>
					</div>
				</>
			)}

			{pendingDelete && (
				<Modal
					open
					onOpenChange={(open) =>
						!open && !isDeleting && setPendingDelete(null)
					}
					title="Удалить документ?"
					actions={
						<>
							<ModalBtnCancel
								onClick={() => setPendingDelete(null)}
								disabled={isDeleting}
							>
								Отмена
							</ModalBtnCancel>
							<ModalBtnDanger
								onClick={async () => {
									if (isDeleting) return;
									try {
										await deleteDocAsync(pendingDelete.id);
										queryClient.invalidateQueries({
											queryKey: serviceKeys.docs(id),
										});
										setPendingDelete(null);
									} catch {
										/* error toast handled by the mutation */
									}
								}}
								disabled={isDeleting}
							>
								{isDeleting ? "Удаляем…" : "Удалить"}
							</ModalBtnDanger>
						</>
					}
				>
					<p className={s.ovSub} style={{ margin: 0 }}>
						Документ «{pendingDelete.name}» будет удалён без возможности
						восстановления.
					</p>
				</Modal>
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
				<Sidebar />
				<Overview id={id} />
			</div>
		</div>
	);
};
