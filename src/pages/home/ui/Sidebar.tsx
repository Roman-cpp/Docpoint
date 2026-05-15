import { useRef, useState } from "react";
import s from "./ApiExplorerPage.module.css";
import { actionImportDoca, selectDocs, useDocaStore } from "@/features/doca";
import { readDoca, readGroups, readSchemas, readEnvConfigs } from "@/shared/db";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "@/core/toast";

export const Sidebar = ({}) => {
	const docs = useDocaStore(selectDocs);
	const importDoca = useDocaStore(actionImportDoca);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importing, setImporting] = useState(false);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setImporting(true);
		try {
			const text = await file.text();
			const json = JSON.parse(text);
			if (!json.doca || !json.groups || !json.entities || !json.envConfigs) {
				throw new Error("Неверный формат: ожидаются поля doca, groups, entities, envConfigs");
			}
			await importDoca(json);
			toast({ variant: "success", title: "Импорт завершён", description: json.doca.name });
		} catch (err) {
			toast({ variant: "error", title: "Ошибка импорта", description: err instanceof Error ? err.message : String(err) });
		} finally {
			setImporting(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleExport = async (docId: string, docName: string) => {
		const [doca, groups, entities, envConfigs] = await Promise.all([
			readDoca(docId),
			readGroups(docId),
			readSchemas(docId),
			readEnvConfigs(docId),
		]);
		const content = JSON.stringify({ doca, groups, entities, envConfigs }, null, 2);
		const filename = `${docName.replace(/\s+/g, "_")}.json`;
		await invoke("save_json_file", { content, filename });
	};

	return (
		<aside className={s.sidebar}>
			<div className={s.sbApis}>
				<span className={s.sbSecLbl}>APIs</span>
				{docs.map((a) => {
					return (
						<div key={a.id} className={s.sbApiRow}>
							<button className={`${s.sbApiBtn}`}>
								<span className={s.sbApiName}>{a.name}</span>
								<div className={s.sbApiDot} />
							</button>
							<button
								className={s.sbApiExportBtn}
								title="Скачать как JSON"
								onClick={() => handleExport(a.id, a.name)}
							>
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
									<polyline points="7 10 12 15 17 10"/>
									<line x1="12" y1="15" x2="12" y2="3"/>
								</svg>
							</button>
						</div>
					);
				})}
			</div>
			<div className={s.sbImport}>
				<input
					ref={fileInputRef}
					type="file"
					accept=".json"
					style={{ display: "none" }}
					onChange={handleFileChange}
				/>
				<button
					className={s.sbImportBtn}
					onClick={() => fileInputRef.current?.click()}
					disabled={importing}
				>
					{importing ? "Импорт..." : "+ Import JSON"}
				</button>
			</div>
		</aside>
	);
};
