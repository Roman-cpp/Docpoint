import { useState, useEffect, type FC } from "react";
import s from "./EnvironmentPage.module.css";
import { Header } from "@/widgets/header";
import {
	selectSelectedEnvironment,
	actionUpdateEnvironment,
	actionAddVariableToEnv,
	actionUpdateVariableInEnv,
	actionDeleteVariableFromEnv,
	useDocStore,
} from "@/features/doc";
import { VariableModal, deleteVariable, updateEnvironment } from "@/entities/environment";
import type { Variable } from "@/entities/environment";
import { getEnvDotColor } from "@/shared/lib/env-color";
import { toast } from "@/core/toast";
import { Sidebar } from "./Sidebar";

export const EnvironmentPage: FC = () => {
	const selectedEnv = useDocStore(selectSelectedEnvironment);
	const patchEnvironment = useDocStore(actionUpdateEnvironment);
	const addVariable = useDocStore(actionAddVariableToEnv);
	const updateVariable = useDocStore(actionUpdateVariableInEnv);
	const removeVariable = useDocStore(actionDeleteVariableFromEnv);

	const [label, setLabel] = useState("");
	const [baseUrl, setBaseUrl] = useState("");
	const [prefix, setPrefix] = useState("");
	const [saving, setSaving] = useState(false);
	const [modal, setModal] = useState<"create" | Variable | null>(null);

	useEffect(() => {
		if (selectedEnv) {
			setLabel(selectedEnv.label);
			setBaseUrl(selectedEnv.baseUrl);
			setPrefix(selectedEnv.prefix);
		}
	}, [selectedEnv?.id]);

	const isDirty =
		selectedEnv !== null &&
		(label !== selectedEnv.label ||
			baseUrl !== selectedEnv.baseUrl ||
			prefix !== selectedEnv.prefix);

	const handleSave = async () => {
		if (!selectedEnv) return;
		setSaving(true);
		try {
			await updateEnvironment({ id: selectedEnv.id, label, baseUrl, prefix });
			patchEnvironment({ id: selectedEnv.id, label, baseUrl, prefix });
			toast({ variant: "success", title: "Saved" });
		} catch {
			toast({ variant: "error", title: "Error", description: "Failed to save environment" });
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (variable: Variable) => {
		try {
			await deleteVariable(variable.id);
			removeVariable(variable.id);
		} catch {
			toast({ variant: "error", title: "Error", description: "Failed to delete variable" });
		}
	};

	return (
		<div className={s.wrapper}>
			<Header section="environments" activeLink="environments" />

			<div className={s.shell}>
				<Sidebar />

				{/* Content */}
				<main className={s.main}>
					{selectedEnv ? (
						<>
							{/* Environment header */}
							<div className={s.envHeader}>
								<div className={s.envTitle}>
									<span
										className={s.envTitleDot}
										style={{ background: getEnvDotColor(selectedEnv.env) }}
									/>
									{label || selectedEnv.label}
								</div>
								<span className={s.envTitleTag}>{selectedEnv.env}</span>
							</div>

							{/* Editable fields */}
							<div className={s.fieldsCard}>
								<div className={s.fieldRow}>
									<label className={s.fieldLabel}>Label</label>
									<input
										className={s.fieldInput}
										value={label}
										onChange={(e) => setLabel(e.target.value)}
										placeholder="Production"
									/>
								</div>
								<div className={s.fieldDivider} />
								<div className={s.fieldRow}>
									<label className={s.fieldLabel}>Base URL</label>
									<input
										className={s.fieldInput}
										value={baseUrl}
										onChange={(e) => setBaseUrl(e.target.value)}
										placeholder="https://api.example.com"
									/>
								</div>
								<div className={s.fieldDivider} />
								<div className={s.fieldRow}>
									<label className={s.fieldLabel}>Prefix</label>
									<input
										className={s.fieldInput}
										value={prefix}
										onChange={(e) => setPrefix(e.target.value)}
										placeholder="/api/v1"
									/>
								</div>

								{isDirty && (
									<div className={s.saveBar}>
										<button
											className={s.saveBtn}
											onClick={handleSave}
											disabled={saving}
										>
											{saving ? "Saving…" : "Save changes"}
										</button>
										<button
											className={s.cancelBtn}
											onClick={() => {
												setLabel(selectedEnv.label);
												setBaseUrl(selectedEnv.baseUrl);
												setPrefix(selectedEnv.prefix);
											}}
										>
											Cancel
										</button>
									</div>
								)}
							</div>

							<div className={s.divider} />

							{/* Variables */}
							<div className={s.section}>
								<div className={s.sectionHdr}>
									<span className={s.sectionTitle}>Variables</span>
									<button className={s.addBtn} onClick={() => setModal("create")}>
										+ Add variable
									</button>
								</div>

								{selectedEnv.value.length === 0 ? (
									<div className={s.empty}>
										No variables yet.{" "}
										<button className={s.emptyLink} onClick={() => setModal("create")}>
											Add one
										</button>
									</div>
								) : (
									<div className={s.table}>
										<div className={s.tableHead}>
											<span>Name</span>
											<span>Value</span>
											<span />
										</div>
										{selectedEnv.value.map((v) => (
											<div key={v.id} className={s.tableRow}>
												<code className={s.varName}>{v.name}</code>
												<code className={s.varValue}>
													{v.value || <span className={s.varEmpty}>empty</span>}
												</code>
												<div className={s.rowActions}>
													<button
														className={s.iconBtn}
														title="Edit"
														onClick={() => setModal(v)}
													>
														<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
															<path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" />
														</svg>
													</button>
													<button
														className={`${s.iconBtn} ${s.iconBtnDanger}`}
														title="Delete"
														onClick={() => handleDelete(v)}
													>
														<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="13" height="13">
															<path d="M2 3.5h10M5.5 3.5V2.5h3v1M5 3.5l.5 8M9 3.5l-.5 8" />
														</svg>
													</button>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</>
					) : (
						<div className={s.placeholder}>Select an environment</div>
					)}
				</main>
			</div>

			{modal === "create" && selectedEnv && (
				<VariableModal
					environmentId={selectedEnv.id}
					onClose={() => setModal(null)}
					onSave={(v) => addVariable(selectedEnv.id, v)}
				/>
			)}
			{modal !== "create" && modal !== null && selectedEnv && (
				<VariableModal
					environmentId={selectedEnv.id}
					variable={modal}
					onClose={() => setModal(null)}
					onSave={(v) => updateVariable(v)}
				/>
			)}
		</div>
	);
};
