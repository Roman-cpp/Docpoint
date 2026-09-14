import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import {
	type DbKind,
	type DbSchema,
	type DbSslMode,
	getDbSchemaApi,
	getDbSchemasApi,
	pickDbFileApi,
} from "@/entities/db-source";
import {
	type ImportErdTarget,
	useImportErd,
} from "@/features/doc-erd/import-erd/@x/doc-erd/import-erd-from-db";
import {
	Button,
	Checkbox,
	Field,
	Input,
	Select,
} from "@/shared/ui-kit/controls";
import { Table, TableHead, TableRow } from "@/shared/ui-kit/data-display";
import { Dialog } from "@/shared/ui-kit/modal";
import { dbSchemaToErd } from "../../lib/dbSchemaToErd";
import {
	type ConnectionDraft,
	DEFAULT_PORT,
	draftProblem,
	emptyDraft,
	isFileBased,
	toConnection,
} from "../../model/connectionDraft";
import s from "./ImportErdFromDbModal.module.css";

const KINDS: { value: DbKind; label: string }[] = [
	{ value: "postgres", label: "PostgreSQL" },
	{ value: "mysql", label: "MySQL" },
	{ value: "sqlite", label: "SQLite (файл)" },
];

const SSL_MODES: { value: DbSslMode; label: string }[] = [
	{ value: "prefer", label: "prefer — по возможности" },
	{ value: "disable", label: "disable — без TLS" },
	{ value: "require", label: "require — обязательно, без проверки" },
	{ value: "verify-full", label: "verify-full — с проверкой сертификата" },
];

interface ImportErdFromDbModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Куда лечь диаграмме — открытый каталог проводника. */
	target: ImportErdTarget;
	/** Вызывается с id созданной диаграммы: страница открывает её. */
	onImported?: (erdId: string) => void;
}

/**
 * Мастер импорта ERD из внешней базы: подключение → выбор таблиц → диаграмма.
 *
 * Реквизиты живут только в состоянии этой формы и уходят на бэкенд с каждым
 * вызовом: подключения нигде не сохраняются. Запись идёт тем же `import_erd`,
 * что и импорт из файла, — интроспекция специально отдаёт схему в его форме.
 */
export const ImportErdFromDbModal: FC<ImportErdFromDbModalProps> = ({
	open,
	onOpenChange,
	target,
	onImported,
}) => {
	const [draft, setDraft] = useState<ConnectionDraft>(emptyDraft);
	const [namespaces, setNamespaces] = useState<string[] | null>(null);
	const [namespace, setNamespace] = useState("");
	const [schema, setSchema] = useState<DbSchema | null>(null);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);

	const { importErdAsync, isImportingErd } = useImportErd(target);

	const patch = (over: Partial<ConnectionDraft>) =>
		setDraft((prev) => ({ ...prev, ...over }));

	const reset = () => {
		setDraft(emptyDraft());
		setNamespaces(null);
		setNamespace("");
		setSchema(null);
		setSelected(new Set());
		setName("");
	};

	const handleOpenChange = (next: boolean) => {
		if (busy || isImportingErd) return;
		if (!next) reset();
		onOpenChange(next);
	};

	const fail = (title: string) => (err: unknown) =>
		toast({
			variant: "error",
			title,
			description: err instanceof Error ? err.message : String(err),
		});

	/** Шаг 1 → 2: подключиться и прочитать список схем. */
	const connect = async () => {
		setBusy(true);
		try {
			const conn = toConnection(draft);
			const found = await getDbSchemasApi(conn);
			setNamespaces(found);

			// У SQLite схема одна, у остальных — своя же база первым кандидатом:
			// лишний выбор из одного пункта только мешает.
			const preferred =
				found.find((it) => it === draft.database.trim()) ??
				found.find((it) => it === "public") ??
				found[0] ??
				"";
			setNamespace(preferred);
			if (found.length === 1) await introspect(preferred);
		} catch (err) {
			fail("Не удалось подключиться")(err);
		} finally {
			setBusy(false);
		}
	};

	/** Шаг 2: прочитать схему целиком и отметить все таблицы. */
	const introspect = async (ns: string) => {
		setBusy(true);
		try {
			const result = await getDbSchemaApi({
				conn: toConnection(draft),
				schema: ns || null,
			});
			setSchema(result);
			setSelected(new Set(result.tables.map((t) => t.name)));
			setName(result.schema);
		} catch (err) {
			setSchema(null);
			fail("Не удалось прочитать схему")(err);
		} finally {
			setBusy(false);
		}
	};

	const toggle = (table: string) =>
		setSelected((prev) => {
			const next = new Set(prev);
			if (!next.delete(table)) next.add(table);
			return next;
		});

	/** Шаг 3: создать диаграмму из отмеченных таблиц и открыть её. */
	const create = async () => {
		if (!schema) return;
		const payload = dbSchemaToErd(schema, selected, {
			name: name.trim(),
			desc: `Импортировано из ${KINDS.find((k) => k.value === draft.kind)?.label}`,
		});

		try {
			const { erdId } = await importErdAsync(payload);
			reset();
			onOpenChange(false);
			onImported?.(erdId);
		} catch {
			// Мутация объясняет свои ошибки сама — модалка остаётся открытой,
			// чтобы выбор таблиц не пришлось делать заново.
		}
	};

	const problem = draftProblem(draft);
	const relations = schema
		? schema.relations.filter(
				(r) => selected.has(r.fromTable) && selected.has(r.toTable),
			).length
		: 0;

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange} width={720}>
			<Dialog.Header>
				<Dialog.Title>ERD из базы данных</Dialog.Title>
				<Dialog.Subtitle>
					{schema
						? "Отметьте таблицы — диаграмма ляжет в открытый каталог"
						: "Читается только схема: ни одной строки ваших данных"}
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				{!schema ? (
					<div className={s.step}>
						<Field label="База данных" required>
							<Select
								options={KINDS}
								value={draft.kind}
								onChange={(e) => {
									const kind = e.target.value as DbKind;
									patch({ kind, port: DEFAULT_PORT[kind] });
									setNamespaces(null);
								}}
							/>
						</Field>

						{isFileBased(draft.kind) ? (
							<Field label="Файл базы" required>
								<div className={s.file}>
									<Input
										value={draft.file}
										onChange={(e) => patch({ file: e.target.value })}
										placeholder="/путь/до/base.db"
									/>
									<Button
										variant="subtle"
										onClick={async () => {
											const picked = await pickDbFileApi();
											if (picked) patch({ file: picked });
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
											onChange={(e) => patch({ host: e.target.value })}
										/>
									</Field>
									<Field label="Порт" required>
										<Input
											value={draft.port}
											onChange={(e) => patch({ port: e.target.value })}
											inputMode="numeric"
										/>
									</Field>
								</div>

								<div className={s.pair}>
									<Field label="Пользователь" required>
										<Input
											value={draft.user}
											onChange={(e) => patch({ user: e.target.value })}
										/>
									</Field>
									<Field label="Пароль">
										<Input
											type="password"
											value={draft.password}
											onChange={(e) => patch({ password: e.target.value })}
										/>
									</Field>
								</div>

								<div className={s.pair}>
									<Field label="База" required>
										<Input
											value={draft.database}
											onChange={(e) => patch({ database: e.target.value })}
										/>
									</Field>
									<Field label="TLS">
										<Select
											options={SSL_MODES}
											value={draft.ssl}
											onChange={(e) =>
												patch({ ssl: e.target.value as DbSslMode })
											}
										/>
									</Field>
								</div>
							</>
						)}

						{namespaces && namespaces.length > 1 && (
							<Field
								label="Схема"
								hint="Диаграмма собирается по одной схеме за раз"
							>
								<Select
									options={namespaces.map((it) => ({ value: it, label: it }))}
									value={namespace}
									onChange={(e) => setNamespace(e.target.value)}
								/>
							</Field>
						)}

						{problem && <p className={s.problem}>{problem}</p>}
					</div>
				) : (
					<div className={s.step}>
						<Field label="Название диаграммы" required>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								style={{ width: "100%" }}
							/>
						</Field>

						<div className={s.summary}>
							<span>
								Выбрано таблиц: {selected.size} из {schema.tables.length} ·
								связей: {relations}
							</span>
							<button
								type="button"
								className={s.link}
								onClick={() =>
									setSelected(
										selected.size === schema.tables.length
											? new Set()
											: new Set(schema.tables.map((t) => t.name)),
									)
								}
							>
								{selected.size === schema.tables.length
									? "Снять все"
									: "Выбрать все"}
							</button>
						</div>

						<Table columns="28px 1fr 92px" className={s.tables}>
							<TableHead>
								<span />
								<span>Таблица</span>
								<span>Колонок</span>
							</TableHead>
							{schema.tables.map((table) => (
								<TableRow key={table.name}>
									<Checkbox
										checked={selected.has(table.name)}
										onChange={() => toggle(table.name)}
									/>
									<span className={s.name} title={table.desc || undefined}>
										{table.name}
									</span>
									<span className={s.dim}>{table.fields.length}</span>
								</TableRow>
							))}
						</Table>

						{schema.notices.length > 0 && (
							<ul className={s.notices}>
								{schema.notices.map((notice) => (
									<li key={notice.message}>{notice.message}</li>
								))}
							</ul>
						)}
					</div>
				)}
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel onClick={() => handleOpenChange(false)}>
					Отмена
				</Dialog.BtnCancel>
				{schema ? (
					<Dialog.BtnPrimary
						onClick={create}
						disabled={
							selected.size === 0 || !name.trim() || isImportingErd || busy
						}
					>
						{isImportingErd ? "Создаём…" : "Создать диаграмму"}
					</Dialog.BtnPrimary>
				) : (
					<Dialog.BtnPrimary
						onClick={() =>
							namespaces && namespaces.length > 1
								? introspect(namespace)
								: connect()
						}
						disabled={!!problem || busy}
					>
						{busy
							? "Читаем схему…"
							: namespaces && namespaces.length > 1
								? "Прочитать схему"
								: "Подключиться"}
					</Dialog.BtnPrimary>
				)}
			</Dialog.Footer>
		</Dialog.Root>
	);
};
