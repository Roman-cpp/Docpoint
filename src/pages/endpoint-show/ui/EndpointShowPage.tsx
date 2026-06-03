import { type FC, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
	actionSelectEndpoint,
	selectDoc,
	selectSelectedEndpoint,
	useDocStore,
} from "@/features/doc";
import {
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import s from "@/shared/styles/apiDocs.module.css";
import { Button } from "@/shared/ui-kit/controls";
import { ResizablePanelsLayout } from "@/shared/ui-kit/layout";
import { Layout } from "@/widgets/layout";
import { DeleteEndpointModal } from "./DeleteEndpointModal";
import { EditEndpointModal } from "./EditEndpointModal";
import { EndpointPage } from "./EndpointPage";
import { TryItPanel } from "./TryItPanel";

export const EndpointShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const doc = useDocStore(selectDoc);
	const endpoint = useDocStore(selectSelectedEndpoint);
	const selectedEnvConfig = useEnvironmentsStore(selectSelectedEnvironment);
	const selectEndpoint = useDocStore(actionSelectEndpoint);

	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

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
							gap: 8,
							marginBottom: 8,
						}}
					>
						<Button variant="subtle" onClick={() => setEditOpen(true)}>
							Редактировать
						</Button>
						<Button variant="danger-ghost" onClick={() => setDeleteOpen(true)}>
							Удалить
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

			<DeleteEndpointModal
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				endpoint={endpoint}
				onDeleted={() => navigate(`/doc-show/${doc?.id}`)}
			/>
		</Layout>
	);
};
