import type { FC } from "react";
import { useParams } from "react-router";
import { actionfetchDoc, useDocStore } from "@/features/doc-api";
import s from "@/shared/styles/apiDocs.module.css";
import { Layout } from "@/widgets/layout/ui/Layout";
import { OverviewPage } from "./OverviewPage";

/* ═══════════════ MAIN PAGE ═══════════════ */
export const DocApiShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();

	const fetchDoc = useDocStore(actionfetchDoc);

	if (!id) return;

	fetchDoc(id);

	return (
		<Layout>
			{/* SHELL */}
			<div className={s.shell}>
				<div className={s.main}>
					<div className={s.docColumn}>
						<div className={s.endpointPanel}>
							<OverviewPage />
						</div>
					</div>
				</div>
			</div>
		</Layout>
	);
};
