import { useRef, useState } from "react";
import { toast } from "@/core/toast";
import { useDocsStore } from "@/entities/doc";
import s from "./ApiExplorerPage.module.css";
import { PlatformsSection } from "./PlatformsSection";

export const Sidebar = () => {
	const { importDoc } = useDocsStore();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importing, setImporting] = useState(false);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setImporting(true);
		try {
			const text = await file.text();
			const json = JSON.parse(text);
			if (
				!json.doc ||
				!json.groups ||
				!json.entities ||
				(!json.environments && !json.envConfigs)
			) {
				throw new Error(
					"Неверный формат: ожидаются поля doc, groups, entities, environments",
				);
			}
			await importDoc({
				doc: json.doc,
				groups: json.groups,
				entities: json.entities,
				environments: json.environments ?? json.envConfigs,
			});
			toast({
				variant: "success",
				title: "Импорт завершён",
				description: json.doc.name,
			});
		} catch (err) {
			toast({
				variant: "error",
				title: "Ошибка импорта",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setImporting(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	return (
		<aside className={s.sidebar}>
			<PlatformsSection />
			<div className={s.sbImport}>
				<input
					ref={fileInputRef}
					type="file"
					accept=".json"
					style={{ display: "none" }}
					onChange={handleFileChange}
				/>
				<button
					type="button"
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
