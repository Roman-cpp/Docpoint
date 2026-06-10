import { type FC, useState } from "react";
import { useParams } from "react-router";
import { actionfetchDoc } from "@/features/doc/doc-workspace-state/store/docStore.actions";
import { useDocStore } from "@/features/doc/doc-workspace-state/store/useDocStore";
import { DocContentEditor } from "@/features/doc/edit-doc-content";
import { cx } from "@/shared/lib/cx";
import s from "@/shared/styles/apiDocs.module.css";
import { Layout } from "@/widgets/layout/ui/Layout";
import { OverviewPage } from "./OverviewPage";

type Tab = "document" | "overview";

/* ═══════════════ MAIN PAGE ═══════════════ */
export const DocShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();
	const [tab, setTab] = useState<Tab>("document");

	const fetchDoc = useDocStore(actionfetchDoc);

	if (!id) return;

	fetchDoc(id);

	return (
		<Layout>
			{/* SHELL */}
			<div className={s.shell}>
				<div className={s.main}>
					<div className={s.docColumn}>
						<div className={s.docTabs}>
							<button
								type="button"
								className={cx(s.docTab, tab === "document" && s.docTabActive)}
								onClick={() => setTab("document")}
							>
								Документ
							</button>
							<button
								type="button"
								className={cx(s.docTab, tab === "overview" && s.docTabActive)}
								onClick={() => setTab("overview")}
							>
								Overview
							</button>
						</div>

						{tab === "document" ? (
							<DocContentEditor docId={id} />
						) : (
							<div className={s.endpointPanel}>
								<OverviewPage />
							</div>
						)}
					</div>
				</div>
			</div>
		</Layout>
	);
};
