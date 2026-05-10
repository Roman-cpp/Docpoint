import { useParams } from "react-router";
import { type FC } from "react";
import { EndpointPage } from "@/pages/api-docs/ui/EndpointPage";
import s from "@/pages/api-docs/ui/ApiDocsPage.module.css";
import { Layout } from "@/widgets/layout/ui/Layout";
import { TryItPanel } from "@/pages/api-explorer/ui/TryItPanel";
import {
	actionSelectEndpoint,
	selectSelectedEndpoint,
	useDocaStore,
} from "@/features/doca";

export const EndpointDetailPage: FC = () => {
	const { id } = useParams<{ id: string }>();

	const endpoint = useDocaStore(selectSelectedEndpoint);
	const selectEndpoint = useDocaStore(actionSelectEndpoint);

	if (!id) return;

	selectEndpoint(id);

	if (!endpoint) {
		return (
			<Layout>
				<div className={s.wrapper}>
					<div className={s.emptyState}>
						<svg
							width="40"
							height="40"
							viewBox="0 0 40 40"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						>
							<rect x="8" y="6" width="24" height="28" rx="3" />
							<path d="M14 14h12M14 19h12M14 24h8" />
						</svg>
						<span>Endpoint not found</span>
					</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			{/* <div className={s.wrapper}> */}
			<div className={s.shell}>
				<div className={s.main}>
					<div className={s.endpointPanel}>
						<EndpointPage detail={endpoint} key={id} />
					</div>
				</div>
			</div>
			{/* </div> */}
			{endpoint && <TryItPanel />}
		</Layout>
	);
};
