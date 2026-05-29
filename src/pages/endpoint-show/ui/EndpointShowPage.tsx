import { type FC, useState } from "react";
import { useParams } from "react-router";
import {
	actionSelectEndpoint,
	selectSelectedEndpoint,
	selectSelectedEnvironment,
	useDocStore,
} from "@/features/doc";
import s from "@/shared/styles/apiDocs.module.css";
import { Button } from "@/shared/ui-kit/controls";
import { ResizablePanelsLayout } from "@/shared/ui-kit/layout";
import { Layout } from "@/widgets/layout";
import { EditEndpointModal } from "./EditEndpointModal";
import { EndpointPage } from "./EndpointPage";
import { TryItPanel } from "./TryItPanel";

export const EndpointShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();

	const endpoint = useDocStore(selectSelectedEndpoint);
	const selectedEnvConfig = useDocStore(selectSelectedEnvironment);
	const selectEndpoint = useDocStore(actionSelectEndpoint);

	const [editOpen, setEditOpen] = useState(false);

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
							<title>Меню навигации</title>
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
			<ResizablePanelsLayout
				right={<TryItPanel />}
				rightWidth={348}
				rightMin={240}
				rightMax={600}
				rightVisible={!!selectedEnvConfig}
			>
				<div className={s.endpointPanel}>
					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
							marginBottom: 8,
						}}
					>
						<Button variant="subtle" onClick={() => setEditOpen(true)}>
							Редактировать
						</Button>
					</div>
					<EndpointPage detail={endpoint} key={id} />
				</div>
			</ResizablePanelsLayout>

			<EditEndpointModal
				open={editOpen}
				onOpenChange={setEditOpen}
				endpoint={endpoint}
			/>
		</Layout>
	);
};
