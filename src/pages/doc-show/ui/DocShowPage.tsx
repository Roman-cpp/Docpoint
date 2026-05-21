import type { FC } from "react";
import s from "@/shared/styles/apiDocs.module.css";
import { OverviewPage } from "./OverviewPage";
import { Layout } from "@/widgets/layout/ui/Layout";

/* ═══════════════ MAIN PAGE ═══════════════ */
export const DocShowPage: FC = () => {
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
