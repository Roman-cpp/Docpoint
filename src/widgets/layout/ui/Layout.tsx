import { Sidebar } from "@/pages/api-docs/ui/Sidebar";
import { Header } from "@/widgets/header";
import s from "@/pages/api-docs/ui/ApiDocsPage.module.css";
import { type ReactNode } from "react";

interface LayoutProps {
	children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
	return (
		<div className={s.wrapper}>
			<Header section="docs1" activeLink="docs" />
			{/* <Header
				version={tweaks.version}
				onTweaksToggle={() => setTweaksVisible((v) => !v)}
			/> */}

			{/* SHELL */}
			<div className={s.shell}>
				<Sidebar />

				<div className={s.main}>
					{children}
					{/* <div ref={panelRef} className={s.endpointPanel}>
						{activeId === "overview" ? (
							<OverviewPage apiData={API_DATA} />
						) : activeDetail ? (
							<EndpointPage detail={activeDetail} key={activeId} />
						) : (
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
								<span>Select an endpoint to view its documentation</span>
							</div>
						)}
					</div>

					{tweaks.showCode && activeDetail && selEp && selApi && (
						<TryItPanel
							ep={selEp}
							api={selApi}
							env={env}
							authToken={authToken}
							onTokenRequest={() => setModal(true)}
						/>
						// <CodePanel detail={activeDetail} key={activeId + "-code"} />
					)} */}
				</div>
			</div>

			{/* <TweaksPanel
				visible={tweaksVisible}
				onClose={() => setTweaksVisible(false)}
				tweaks={tweaks}
				setTweak={setTweak}
			/> */}
		</div>
	);
}
