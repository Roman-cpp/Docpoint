import type { FC } from "react";
import { Button, Field, Input, Select } from "@/shared/ui-kit/controls";
import { pickDbFileApi } from "../../api/pick-db-file-api";
import {
	type ConnectionDraft,
	DB_KIND_LABEL,
	DEFAULT_PORT,
	draftProblem,
	isFileBased,
} from "../../lib/connectionDraft";
import type { DbSslMode } from "../../model/db-source.dto";
import type { DbKind } from "../../model/db-source.type";
import s from "./DbConnectionForm.module.css";

const KINDS: { value: DbKind; label: string }[] = [
	{ value: "postgres", label: DB_KIND_LABEL.postgres },
	{ value: "mysql", label: DB_KIND_LABEL.mysql },
	// У файловой базы уточнение в подписи: спрашивается не хост, а путь.
	{ value: "sqlite", label: `${DB_KIND_LABEL.sqlite} (файл)` },
];

const SSL_MODES: { value: DbSslMode; label: string }[] = [
	{ value: "prefer", label: "prefer — по возможности" },
	{ value: "disable", label: "disable — без TLS" },
	{ value: "require", label: "require — обязательно, без проверки" },
	{ value: "verify-full", label: "verify-full — с проверкой сертификата" },
];

interface DbConnectionFormProps {
	draft: ConnectionDraft;
	/** Частичное изменение черновика; смена вида базы приходит вместе с портом. */
	onChange: (patch: Partial<ConnectionDraft>) => void;
	/** Схемы, которые отдало подключение; `null` — ещё не подключались. */
	namespaces: string[] | null;
	namespace: string;
	onNamespaceChange: (next: string) => void;
}

/**
 * Реквизиты подключения к внешней базе.
 *
 * Форма живёт в сущности, а не в фиче, потому что описывает ровно её DTO и
 * нужна каждому, кто к базе обращается: и импорту диаграммы, и сравнению с
 * ней. Состояние формы держит вызывающая сторона — она же решает, что делать
 * с реквизитами дальше; здесь их никто не сохраняет.
 */
export const DbConnectionForm: FC<DbConnectionFormProps> = ({
	draft,
	onChange,
	namespaces,
	namespace,
	onNamespaceChange,
}) => {
	const problem = draftProblem(draft);

	return (
		<div className={s.form}>
			<Field label="База данных" required>
				<Select
					options={KINDS}
					value={draft.kind}
					onChange={(e) => {
						const kind = e.target.value as DbKind;
						onChange({ kind, port: DEFAULT_PORT[kind] });
					}}
				/>
			</Field>

			{isFileBased(draft.kind) ? (
				<Field label="Файл базы" required>
					<div className={s.file}>
						<Input
							value={draft.file}
							onChange={(e) => onChange({ file: e.target.value })}
							placeholder="/путь/до/base.db"
						/>
						<Button
							variant="subtle"
							onClick={async () => {
								const picked = await pickDbFileApi();
								if (picked) onChange({ file: picked });
							}}
						>
							Выбрать…
						</Button>
					</div>
				</Field>
			) : (
				<>
					<div className={s.row}>
						<Field label="Хост" required>
							<Input
								value={draft.host}
								onChange={(e) => onChange({ host: e.target.value })}
							/>
						</Field>
						<Field label="Порт" required>
							<Input
								value={draft.port}
								onChange={(e) => onChange({ port: e.target.value })}
								inputMode="numeric"
							/>
						</Field>
					</div>

					<div className={s.pair}>
						<Field label="Пользователь" required>
							<Input
								value={draft.user}
								onChange={(e) => onChange({ user: e.target.value })}
							/>
						</Field>
						<Field label="Пароль">
							<Input
								type="password"
								value={draft.password}
								onChange={(e) => onChange({ password: e.target.value })}
							/>
						</Field>
					</div>

					<div className={s.pair}>
						<Field label="База" required>
							<Input
								value={draft.database}
								onChange={(e) => onChange({ database: e.target.value })}
							/>
						</Field>
						<Field label="TLS">
							<Select
								options={SSL_MODES}
								value={draft.ssl}
								onChange={(e) => onChange({ ssl: e.target.value as DbSslMode })}
							/>
						</Field>
					</div>
				</>
			)}

			{namespaces && namespaces.length > 1 && (
				<Field label="Схема" hint="За раз читается одна схема">
					<Select
						options={namespaces.map((it) => ({ value: it, label: it }))}
						value={namespace}
						onChange={(e) => onNamespaceChange(e.target.value)}
					/>
				</Field>
			)}

			{problem && <p className={s.problem}>{problem}</p>}
		</div>
	);
};
