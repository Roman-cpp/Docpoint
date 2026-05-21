import { useState, useRef, useEffect } from "react";
import type { FC } from "react";
import type { TweakSettings } from "../model/types";
import s from "@/shared/styles/apiDocs.module.css";
import { OverviewPage } from "../../overview/ui/OverviewPage";
import { Layout } from "@/widgets/layout/ui/Layout";

/* ═══════════════ CONSTANTS ═══════════════ */
const TWEAK_DEFAULTS: TweakSettings = {
	density: "Default",
	showCode: true,
	showTry: true,
	version: "v2",
	theme: "Light",
};

const DARK_TOKENS: Record<string, string> = {
	"--bg": "#141210",
	"--surface": "#1C1917",
	"--ink": "#F0EDE8",
	"--ink-mid": "#A09890",
	"--ink-low": "#706860",
	"--border": "#2E2A26",
	"--border-h": "#403830",
	"--cat-bg": "#252018",
	"--cat-ink": "#C0B8A8",
	"--code-bg": "#1A1612",
	"--code-ink": "#D0C8B8",
};

const LIGHT_TOKENS: Record<string, string> = {
	"--bg": "#FAF7F2",
	"--surface": "#FFFFFF",
	"--ink": "#1A1A1A",
	"--ink-mid": "#555555",
	"--ink-low": "#888888",
	"--border": "#E8E2D9",
	"--border-h": "#C8C0B4",
	"--cat-bg": "#F0EDE8",
	"--cat-ink": "#4A4540",
	"--code-bg": "#F4F1EC",
	"--code-ink": "#3D2B1F",
};

/* ═══════════════ TWEAKS PANEL ═══════════════ */
interface TweaksPanelProps {
	visible: boolean;
	onClose: () => void;
	tweaks: TweakSettings;
	setTweak: (
		key: keyof TweakSettings,
		val: TweakSettings[keyof TweakSettings],
	) => void;
}

const TweaksPanel: FC<TweaksPanelProps> = ({
	visible,
	onClose,
	tweaks,
	setTweak,
}) => (
	<div className={`${s.tweaksPanel} ${visible ? s.visible : ""}`}>
		<div className={s.tweaksPanelHeader}>
			<span className={s.tweaksPanelTitle}>Tweaks</span>
			<button className={s.tweaksPanelClose} onClick={onClose}>
				<svg
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
				>
					<path d="M2 2l8 8M10 2l-8 8" />
				</svg>
			</button>
		</div>
		<div className={s.tweaksBody}>
			<div className={s.tweakRow}>
				<div className={s.tweakLabel}>Layout density</div>
				<div className={s.tweakOptions}>
					{(["Compact", "Default", "Spacious"] as const).map((o) => (
						<button
							key={o}
							className={`${s.tweakOpt} ${tweaks.density === o ? s.active : ""}`}
							onClick={() => setTweak("density", o)}
						>
							{o}
						</button>
					))}
				</div>
			</div>
			<div className={s.tweakRow}>
				<div className={s.tweakToggle}>
					<span className={s.tweakToggleLabel}>Show code panel</span>
					<button
						className={`${s.toggleSwitch} ${tweaks.showCode ? s.on : ""}`}
						onClick={() => setTweak("showCode", !tweaks.showCode)}
					/>
				</div>
			</div>
			<div className={s.tweakRow}>
				<div className={s.tweakToggle}>
					<span className={s.tweakToggleLabel}>Show Try it out</span>
					<button
						className={`${s.toggleSwitch} ${tweaks.showTry ? s.on : ""}`}
						onClick={() => setTweak("showTry", !tweaks.showTry)}
					/>
				</div>
			</div>
			<div className={s.tweakRow}>
				<div className={s.tweakLabel}>API version</div>
				<select
					className={s.versionSelect}
					value={tweaks.version}
					onChange={(e) => setTweak("version", e.target.value)}
				>
					<option value="v2">v2 (current)</option>
					<option value="v1">v1 (deprecated)</option>
				</select>
			</div>
			<div className={s.tweakRow}>
				<div className={s.tweakLabel}>Theme</div>
				<div className={s.tweakOptions}>
					{(["Light", "Dark"] as const).map((o) => (
						<button
							key={o}
							className={`${s.tweakOpt} ${tweaks.theme === o ? s.active : ""}`}
							onClick={() => setTweak("theme", o)}
						>
							{o}
						</button>
					))}
				</div>
			</div>
		</div>
	</div>
);

/* ═══════════════ MAIN PAGE ═══════════════ */
export const DocsPage: FC = () => {
	const [activeId] = useState("overview");
	const [tweaksVisible, setTweaksVisible] = useState(false);
	const [tweaks, setTweaksState] = useState<TweakSettings>(TWEAK_DEFAULTS);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	const setTweak = (
		key: keyof TweakSettings,
		val: TweakSettings[keyof TweakSettings],
	) => setTweaksState((p) => ({ ...p, [key]: val }) as TweakSettings);

	useEffect(() => {
		const el = wrapperRef.current;
		if (!el) return;
		const tokens = tweaks.theme === "Dark" ? DARK_TOKENS : LIGHT_TOKENS;
		Object.entries(tokens).forEach(([k, v]) => el.style.setProperty(k, v));
	}, [tweaks.theme]);

	useEffect(() => {
		const el = panelRef.current;
		if (!el) return;
		const pad =
			tweaks.density === "Compact"
				? "20px 28px 40px"
				: tweaks.density === "Spacious"
					? "48px 56px 80px"
					: "32px 40px 60px";
		el.style.padding = pad;
	}, [tweaks.density, activeId]);

	return (
		<Layout>
			{/* SHELL */}
			<div className={s.shell}>
				<div className={s.main}>
					<div ref={panelRef} className={s.endpointPanel}>
						<OverviewPage />
					</div>
				</div>
			</div>

			<TweaksPanel
				visible={tweaksVisible}
				onClose={() => setTweaksVisible(false)}
				tweaks={tweaks}
				setTweak={setTweak}
			/>
		</Layout>
	);
};
