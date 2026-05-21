import { type FC, useEffect, useState } from "react";
import type { Entity } from "@/entities/entity";
import {
	selectEntities,
	selectSelectedEntity,
	useDocStore,
} from "@/features/doc";
import { Header } from "@/widgets/header";
import type { SchemaTweaks } from "../model/types";
import s from "./ApiSchemasPage.module.css";
import { Sidebar } from "./Sidebar";

/* ─── constants ─── */
const TWEAK_DEFAULTS: SchemaTweaks = {
	showNotes: true,
	compactJson: false,
	fieldDensity: "Default",
};

const TYPE_CLASS: Record<string, string> = {
	string: s.typeString,
	integer: s.typeInteger,
	boolean: s.typeBoolean,
	array: s.typeArray,
	object: s.typeObject,
	uuid: s.typeUuid,
	datetime: s.typeDatetime,
	enum: s.typeEnum,
};

const METHOD_CFG: Record<string, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
};

/* ─── EntityDetail ─── */
interface EntityDetailProps {
	entity: Entity;
}

const EntityDetail: FC<EntityDetailProps> = ({ entity }) => {
	const enumFields = entity.fields.filter((f) => f.enum);

	return (
		<div className={s.detailWrap}>
			<div className={s.detailInner}>
				{/* LEFT */}
				<div className={s.schemaCol}>
					<div className={s.entityHeader}>
						<div className={s.entityEyebrow}>
							<span>Schema</span>
							<span style={{ color: "var(--border-h)" }}>·</span>
							<span style={{ color: "var(--ink)" }}>{entity.name}</span>
						</div>
						<div className={s.entityTitleRow}>
							{/* <div className={s.entityIconLg}>
								<img src={entity.icon} alt={entity.name} />
							</div> */}
							<h1 className={s.entityName}>{entity.name}</h1>
						</div>
						<p className={s.entityDesc}>{entity.desc}</p>
					</div>

					<div className={s.divider} />

					<div className={s.sectionLabel}>Fields</div>
					<div className={s.fieldsTable}>
						<div className={s.fieldsHead}>
							<span>Field</span>
							<span>Type</span>
							<span>Description</span>
							<span>Example</span>
						</div>
						{entity.fields.map((f) => (
							<div
								key={f.name}
								className={`${s.fieldRow}${!f.req ? " " + s.fieldRowOptional : ""}`}
							>
								<div className={s.fName}>
									{f.name}
									{f.req && <span className={s.fReq}>required</span>}
									{f.nullable && <span className={s.fNullable}>nullable</span>}
								</div>
								<span className={`${s.fType} ${TYPE_CLASS[f.type] ?? ""}`}>
									{f.type}
								</span>
								<div>
									<div className={s.fDesc}>{f.desc}</div>
								</div>
								<span className={s.fExample}>{f.example}</span>
							</div>
						))}
					</div>

					{enumFields.map((ef) => (
						<div key={ef.name} style={{ marginTop: 24 }}>
							<div className={s.divider} />
							<div className={s.sectionLabel}>
								Enum: <span className={s.ic}>{ef.name}</span>
							</div>
							<div className={s.enumBlock}>
								{ef.enum!.map((e) => (
									<div className={s.enumRow} key={e.val}>
										<span className={s.enumVal}>{e.val}</span>
										<span className={s.enumDesc}>{e.desc}</span>
									</div>
								))}
							</div>
						</div>
					))}
				</div>

				{/* RIGHT */}
				<div className={s.jsonCol}>
					<div className={s.jsonColSticky}>
						{/* <div className={s.usedByWidget}>
							<div className={s.widgetTitle}>
								Used by {entity.usedBy.length} endpoints
							</div>
							{entity.usedBy.map((u, i) => {
								const ms = METHOD_CFG[u.method] ?? {};
								return (
									<div className={s.usedByItem} key={i}>
										<span
											className={s.usedByMethod}
											style={{ color: ms.color, background: ms.bg }}
										>
											{u.method}
										</span>
										<span className={s.usedByPath}>{u.path}</span>
										<span className={s.usedByRole}>{u.role}</span>
									</div>
								);
							})}
						</div> */}
					</div>
				</div>
			</div>
		</div>
	);
};

/* ─── TweaksPanel ─── */
interface TweaksPanelProps {
	visible: boolean;
	onClose: () => void;
	tweaks: SchemaTweaks;
	setTweak: <K extends keyof SchemaTweaks>(
		key: K,
		val: SchemaTweaks[K],
	) => void;
}

const TweaksPanel: FC<TweaksPanelProps> = ({
	visible,
	onClose,
	tweaks,
	setTweak,
}) => (
	<div
		className={`${s.tweaksPanel}${visible ? " " + s.tweaksPanelVisible : ""}`}
	>
		<div className={s.tweaksHdr}>
			<span className={s.tweaksTitle}>Tweaks</span>
			<button className={s.tweaksClose} onClick={onClose}>
				<svg
					viewBox="0 0 11 11"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
				>
					<path d="M1.5 1.5l8 8M9.5 1.5l-8 8" />
				</svg>
			</button>
		</div>
		<div className={s.tweaksBody}>
			<div className={s.tweakRow}>
				<div className={s.tweakToggleRow}>
					<span className={s.tweakToggleLbl}>Show field notes</span>
					<button
						className={`${s.toggleSw}${tweaks.showNotes ? " " + s.toggleSwOn : ""}`}
						onClick={() => setTweak("showNotes", !tweaks.showNotes)}
					/>
				</div>
			</div>
			<div className={s.tweakRow}>
				<div className={s.tweakToggleRow}>
					<span className={s.tweakToggleLbl}>Compact JSON example</span>
					<button
						className={`${s.toggleSw}${tweaks.compactJson ? " " + s.toggleSwOn : ""}`}
						onClick={() => setTweak("compactJson", !tweaks.compactJson)}
					/>
				</div>
			</div>
			<div className={s.tweakRow}>
				<div className={s.tweakLbl}>Field row density</div>
				<div className={s.tweakOpts}>
					{(["Compact", "Default", "Spacious"] as const).map((o) => (
						<button
							key={o}
							className={`${s.tweakOpt}${tweaks.fieldDensity === o ? " " + s.tweakOptActive : ""}`}
							onClick={() => setTweak("fieldDensity", o)}
						>
							{o}
						</button>
					))}
				</div>
			</div>
		</div>
	</div>
);

/* ─── EntityPage ─── */
export const EntityPage: FC = () => {
	// const [activeId, setActiveId] = useState("user");
	const ENTITIES = useDocStore(selectEntities);
	const activeEntity = useDocStore(selectSelectedEntity);

	const [search, setSearch] = useState("");
	const [tweaksVisible, setTweaksVisible] = useState(false);
	const [tweaks, setTweaksState] = useState<SchemaTweaks>(TWEAK_DEFAULTS);

	const setTweak = <K extends keyof SchemaTweaks>(
		key: K,
		val: SchemaTweaks[K],
	) => {
		setTweaksState((p) => {
			const next = { ...p, [key]: val };
			window.parent?.postMessage(
				{ type: "__edit_mode_set_keys", edits: next },
				"*",
			);
			return next;
		});
	};

	useEffect(() => {
		const handler = (e: MessageEvent) => {
			if (e.data?.type === "__activate_edit_mode") setTweaksVisible(true);
			if (e.data?.type === "__deactivate_edit_mode") setTweaksVisible(false);
		};
		window.addEventListener("message", handler);
		window.parent?.postMessage({ type: "__edit_mode_available" }, "*");
		return () => window.removeEventListener("message", handler);
	}, []);

	const filtered = search.trim()
		? ENTITIES.filter(
				(e) =>
					e.name.toLowerCase().includes(search.toLowerCase()) ||
					e.desc.toLowerCase().includes(search.toLowerCase()),
			)
		: ENTITIES;

	// const activeEntity = ENTITIES.find((e) => e.id === activeId);

	return (
		<div className={s.wrapper}>
			<Header section="API Schemas" activeLink="entity" />

			<div className={s.shell}>
				<Sidebar filtered={filtered} search={search} onSearch={setSearch} />

				{/* MAIN */}
				<div className={s.main}>
					{activeEntity ? (
						<EntityDetail entity={activeEntity} />
					) : (
						<div className={s.emptyState}>
							<svg
								viewBox="0 0 48 48"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.3"
								strokeLinecap="round"
							>
								<rect x="6" y="6" width="36" height="36" rx="4" />
								<path d="M14 17h20M14 24h20M14 31h12" />
							</svg>
							<div className={s.emptyTitle}>Select a schema</div>
							<div className={s.emptySub}>
								Choose an entity from the sidebar to view its full field
								documentation.
							</div>
						</div>
					)}
				</div>
			</div>

			<TweaksPanel
				visible={tweaksVisible}
				onClose={() => {
					setTweaksVisible(false);
					window.parent?.postMessage({ type: "__edit_mode_dismissed" }, "*");
				}}
				tweaks={tweaks}
				setTweak={setTweak}
			/>
		</div>
	);
};
