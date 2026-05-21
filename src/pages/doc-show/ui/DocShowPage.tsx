import type { FC } from "react";
import s from "@/shared/styles/apiDocs.module.css";
import { OverviewPage } from "./OverviewPage";
import { Layout } from "@/widgets/layout/ui/Layout";
import { useParams } from "react-router";
import { actionLoadDoc } from "@/features/doc/store/docStore.actions";
import { useDocStore } from "@/features/doc/store/useDocStore";

/* ═══════════════ MAIN PAGE ═══════════════ */
export const DocShowPage: FC = () => {
  const { id } = useParams<{ id: string }>();

  const loadDoc = useDocStore(actionLoadDoc);

  if(!id) return;

  loadDoc(id);
  
	return (
		<Layout>
			{/* SHELL */}
			<div className={s.shell}>
				<div className={s.main}>
					<div className={s.endpointPanel}>
						<OverviewPage />
					</div>
				</div>
			</div>
		</Layout>
	);
};
