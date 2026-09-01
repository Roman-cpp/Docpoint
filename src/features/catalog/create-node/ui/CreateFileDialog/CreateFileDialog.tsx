import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import { formatFileSize, type PickedFile, pickFileApi } from "@/entities/file";
import { UploadIcon } from "@/shared/svg";
import { Button, Field, Input, Textarea } from "@/shared/ui-kit/controls";
import type { CreateNodeDialogProps } from "../../model/create-node.type";
import { useCreateNode } from "../../model/useCreateNode";
import { CreateDialogShell } from "../CreateDialogShell";
import s from "./CreateFileDialog.module.css";

/**
 * Загрузка любого файла в дерево: pdf, таблицы, картинки, архивы — всё, что
 * должно лежать рядом с документами платформы. Файл забирается копией в
 * хранилище приложения, поэтому дальше он не зависит от того, что случится с
 * оригиналом.
 *
 * Своей страницы у такого документа нет — открывает его та программа, которой
 * этот тип файлов открывается в системе.
 */
export const CreateFileDialog: FC<CreateNodeDialogProps> = ({
	parentName,
	isSaving = false,
	onClose,
	onCreate,
}) => {
	const [picked, setPicked] = useState<PickedFile | null>(null);
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");
	/** Имя правили руками — следующий выбранный файл его больше не подменяет. */
	const [named, setNamed] = useState(false);
	const create = useCreateNode({ isSaving, onClose, onCreate });

	const choose = useCallback(async () => {
		try {
			const file = await pickFileApi();
			if (!file) return;

			setPicked(file);
			setName((current) => (named ? current : file.name));
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось выбрать файл",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	}, [named]);

	// Окно открывают, чтобы загрузить файл, поэтому системный диалог показывается
	// сразу: без этого первым действием всегда был бы один и тот же клик.
	const asked = useRef(false);
	useEffect(() => {
		if (asked.current) return;
		asked.current = true;
		void choose();
	}, [choose]);

	const trimmed = name.trim();
	const submit = () =>
		create(
			picked && trimmed
				? {
						name: trimmed,
						desc: desc.trim(),
						payload: { kind: "file", sourcePath: picked.path },
					}
				: null,
		);

	return (
		<CreateDialogShell
			title="Загрузить файл"
			parentName={parentName}
			canCreate={!!picked && !!trimmed}
			isSaving={isSaving}
			onClose={onClose}
			onSubmit={submit}
		>
			<Field label="Файл" required>
				<div className={s.picker}>
					<Button
						variant="subtle"
						icon={<UploadIcon size={13} />}
						onClick={choose}
						disabled={isSaving}
					>
						{picked ? "Выбрать другой…" : "Выбрать файл…"}
					</Button>

					{picked ? (
						<span className={s.chosen}>
							<span className={s.chosenName} title={picked.path}>
								{picked.name}
							</span>
							<span className={s.chosenSize}>
								{formatFileSize(picked.size)}
							</span>
						</span>
					) : (
						<span className={s.empty}>Файл не выбран</span>
					)}
				</div>
			</Field>

			<Field
				label="Название"
				hint="как файл будет называться в дереве"
				required
			>
				<Input
					value={name}
					onChange={(e) => {
						setName(e.target.value);
						setNamed(true);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") submit();
					}}
					placeholder="Например, Смета.xlsx"
					style={{ width: "100%" }}
				/>
			</Field>

			<Field label="Описание">
				<Textarea
					value={desc}
					onChange={(e) => setDesc(e.target.value)}
					placeholder="Что это за файл и зачем он здесь"
					rows={3}
					style={{ width: "100%" }}
				/>
			</Field>
		</CreateDialogShell>
	);
};
