import { type FC, useState } from "react";
import type { Entity } from "@/entities/entity";
import {
	actionUpdateEntity,
	DeleteEntityModal,
	EditEntityModal,
	selectEntities,
	selectSelectedEntity,
	useDocStore,
} from "@/features/doc";
import { Header } from "@/widgets/header";
import s from "./ApiSchemasPage.module.css";
import { Sidebar } from "./Sidebar";

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

/* ─── EntityDetail ─── */
interface EntityDetailProps {
	entity: Entity;
}

const EntityDetail: FC<EntityDetailProps> = ({ entity }) => {
	const enumFields = entity.fields.filter((f) => f.enum);

	const updateEntity = useDocStore(actionUpdateEntity);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	const handleSave = async (updated: Parameters<typeof updateEntity>[0]) => {
		setSaving(true);
		try {
			await updateEntity(updated);
			setEditOpen(false);
		} catch (e) {
			console.error("[EntityPage] updateEntity failed:", e);
		} finally {
			setSaving(false);
		}
	};

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
							<div className={s.entityActions}>
								<button
									type="button"
									className={s.editBtn}
									onClick={() => setEditOpen(true)}
								>
									Редактировать
								</button>
								<button
									type="button"
									className={s.deleteBtn}
									onClick={() => setDeleteOpen(true)}
								>
									Удалить
								</button>
							</div>
						</div>
						<p className={s.entityDesc}>{entity.desc}</p>
					</div>

					<EditEntityModal
						key={entity.id}
						open={editOpen}
						onOpenChange={setEditOpen}
						entity={entity}
						onSave={handleSave}
						isSaving={saving}
					/>
					<DeleteEntityModal
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						entity={entity}
					/>

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

/* ─── EntityPage ─── */
export const EntityPage: FC = () => {
	const ENTITIES = useDocStore(selectEntities);
	const activeEntity = useDocStore(selectSelectedEntity);

	const [search, setSearch] = useState("");

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
		</div>
	);
};
