import { useState } from "react";
import type { FC } from "react";
import type { EndpointDetail } from "../model/types";
import s from "@/shared/styles/apiDocs.module.css";

const CodeSnippet: FC<{ lang: string; code: string }> = ({ lang, code }) => {
	const [copied, setCopied] = useState(false);
	const copy = () => {
		navigator.clipboard?.writeText(code).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};
	return (
		<div className={s.codeSnippet}>
			<div className={s.codeSnippetHeader}>
				<span className={s.codeSnippetLang}>{lang}</span>
				<button className={s.codeSnippetCopy} onClick={copy}>
					<svg
						viewBox="0 0 10 10"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<rect x="3" y="3" width="6" height="6" rx="1" />
						<path
							d="M7 3V1.5a1 1 0 00-1-1H1.5a1 1 0 00-1 1V6a1 1 0 001 1H3"
							strokeLinecap="round"
						/>
					</svg>
					{copied ? "Copied!" : "Copy"}
				</button>
			</div>
			<pre>{code}</pre>
		</div>
	);
};

export const CodePanel: FC<{ detail: EndpointDetail }> = () => {
	// const [tab, setTab] = useState("curl");
	// const tabs = Object.keys(detail.codeExamples);

	return (
		<div className={s.codePanel}>
			<div className={s.codePanelTabs}>
				{/* {tabs.map((t) => (
					<button
						key={t}
						className={`${s.codePanelTab} ${tab === t ? s.active : ""}`}
						onClick={() => setTab(t)}
					>
						{CODE_LABELS[t] ?? t}
					</button>
				))} */}
			</div>
			<div className={s.codePanelBody}>
				<div>
					<div className={s.codePanelSectionLabel}>Request</div>
					{/* <CodeSnippet
						lang={CODE_LABELS[tab] ?? tab}
						code={detail.codeExamples[tab]} */}
					{/* /> */}
				</div>
				<div>
					<div className={s.codePanelSectionLabel} style={{ marginTop: "4px" }}>
						Base URL
					</div>
					<CodeSnippet lang="ENV" code="BASE_URL=https://api.example.com/v2" />
				</div>
			</div>
		</div>
	);
};
