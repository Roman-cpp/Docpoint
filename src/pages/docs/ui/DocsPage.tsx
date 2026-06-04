import { type FC, useState } from "react";
import { Link } from "react-router";
import { type Doc, type UpdateDocDTO, useDocsStore } from "@/entities/doc";
import { usePlatformsStore } from "@/entities/platform";
import { actionResetDoc, useDocStore } from "@/features/doc";
import {
	actionResetEnvironments,
	useEnvironmentsStore,
} from "@/features/environment";
import { DropMenu } from "@/shared/ui-kit/controls";
import { Header } from "@/widgets/header";
import { DeleteDocModal } from "../../../features/doc/delete-doc/ui/DeleteDocModal";
import { EditDocModal } from "../../../features/doc/edit-doc/ui/EditDocModal";
import { exportDoc } from "../lib/exportDoc";
import s from "./ApiExplorerPage.module.css";
import { Sidebar } from "./Sidebar";

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview = () => {
	const { docs, updateDoc } = useDocsStore();
	const { platforms, attachDoc } = usePlatformsStore();
	const [pendingDoc, setPendingDoc] = useState<Doc | null>(null);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const resetDoc = useDocStore(actionResetDoc);
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
