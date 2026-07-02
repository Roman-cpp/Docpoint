import { type FC, useState } from "react";
import { Link } from "react-router";
import { type Doc, type UpdateDocDTO, useDocsStore } from "@/entities/doc-api";
import { useAllServices, useAttachDoc } from "@/entities/service";
import { actionResetDocApi, useDocApiStore } from "@/features/doc-api";
import {
	actionResetEnvironments,
	useEnvironmentsStore,
} from "@/features/environment";
import { DropMenu } from "@/shared/ui-kit/controls";
import { Header } from "@/widgets/header";
import { DeleteDocApiModal } from "../../../features/doc-api/delete-doc-api/ui/DeleteDocApiModal";
import { EditDocApiModal } from "../../../features/doc-api/edit-doc-api/ui/EditDocApiModal";
import { exportDoc } from "../lib/exportDoc";
import s from "./ApiExplorerPage.module.css";
import { Sidebar } from "./Sidebar";

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview = () => {
	const { docs, updateDoc } = useDocsStore();
	const { services } = useAllServices();
	const { attachDoc } = useAttachDoc();
	const [pendingDoc, setPendingDoc] = useState<Doc | null>(null);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const resetDoc = useDocApiStore(actionResetDocApi);
	const resetEnvironments = useEnvironmentsStore(actionResetEnvironments);

	resetDoc();
	resetEnvironments();

	const handleSaveEdit = (update: UpdateDocDTO) => {
		updateDoc(update);
		setIsEditOpen(false);
	};

	return (
		<div className={s.overview}>
			<div className={s.apiCardsGrid}>
				{docs.map((a) => {
					return (
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
													Add to service
												</DropMenu.SubTrigger>
												<DropMenu.SubContent>
													{services.length === 0 ? (
														<DropMenu.Item disabled>No services</DropMenu.Item>
													) : (
														services.map((svc) => (
															<DropMenu.Item
																key={svc.id}
																onClick={() =>
																	attachDoc({
																		serviceId: svc.id,
																		docId: a.id,
																	})
																}
															>
																{svc.name}
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
								{a.tags.map((t) => (
									<span key={t} className={s.acTag}>
										{t}
									</span>
								))}
								<span className={s.acCount}> endpoints →</span>
							</div>
						</Link>
					);
				})}
			</div>
			{pendingDoc && (
				<>
					<EditDocApiModal
						open={isEditOpen}
						onOpenChange={setIsEditOpen}
						doc={pendingDoc}
						onSave={handleSaveEdit}
					/>
					<DeleteDocApiModal
						open={isDeleteOpen}
						onOpenChange={setIsDeleteOpen}
						doc={pendingDoc}
					/>
				</>
			)}
		</div>
	);
};

/* ═══════════════ MAIN PAGE ═══════════════ */
export const DocsPage: FC = () => {
	return (
		<div className={s.wrapper}>
			<Header section="docs" activeLink="docs" />

			<div className={s.shell}>
				<Sidebar />
				<Overview />
			</div>
		</div>
	);
};
