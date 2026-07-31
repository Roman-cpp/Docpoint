import { type FC, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
	actionSelectEndpoint,
	selectDocApi,
	selectSelectedEndpoint,
	useDocApiStore,
} from "@/features/doc-api";
import s from "@/shared/styles/apiDocs.module.css";
import { Button } from "@/shared/ui-kit/controls";
import { DockLayout } from "@/shared/ui-kit/layout";
import { Header } from "@/widgets/header";
import { Layout } from "@/widgets/layout";
import { Sidebar } from "@/widgets/layout/ui/Sidebar";
import { TryItPanel } from "@/widgets/try-it";
import { BottomConsolePanel } from "../BottomConsolePanel";
import { DeleteEndpointModal } from "../DeleteEndpointModal";
import { EditEndpointModal } from "../EditEndpointModal";
import { EndpointPage } from "../EndpointPage";

export const EndpointShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const doc = useDocApiStore(selectDocApi);
	const endpoint = useDocApiStore(selectSelectedEndpoint);
	const selectEndpoint = useDocApiStore(actionSelectEndpoint);

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
		<DockLayout.Root className={s.wrapper}>
			<DockLayout.Header>
				<Header section="docs1" activeLink="docs" />
			</DockLayout.Header>

			<DockLayout.Body>
				<DockLayout.Left>
					<Sidebar />
				</DockLayout.Left>

				<DockLayout.Center>
					<DockLayout.Main>
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
								<Button
									variant="danger-ghost"
									onClick={() => setDeleteOpen(true)}
								>
									Удалить
								</Button>
							</div>
							<EndpointPage detail={endpoint} key={id} />
						</div>
					</DockLayout.Main>

					<DockLayout.Bottom>
						<BottomConsolePanel />
					</DockLayout.Bottom>
				</DockLayout.Center>

				<DockLayout.Right>
					<TryItPanel />
				</DockLayout.Right>
			</DockLayout.Body>

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
		</DockLayout.Root>
	);
};
