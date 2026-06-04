import { type FC, useState } from "react";
import { Link, useParams } from "react-router";
import { type Doc, type UpdateDocDTO, useDocsStore } from "@/entities/doc";
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
import { DropMenu } from "@/shared/ui-kit/controls";
import { Header } from "@/widgets/header";

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview: FC<{ id: string }> = ({ id }) => {
	const { platforms, attachDoc } = usePlatformsStore();
	const { updateDoc } = useDocsStore();
	const { docs, isDocsLoading } = usePlatformDocs(id);
	const [pendingDoc, setPendingDoc] = useState<Doc | null>(null);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);

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
		<div className={s.overview}>
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
