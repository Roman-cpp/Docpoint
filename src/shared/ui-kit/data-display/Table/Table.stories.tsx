import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
	Table,
	TableActions,
	TableEmpty,
	TableGrip,
	TableHead,
	TableRow,
	StatusBadge,
} from "./Table";

/* ─── Inline icons ──────────────────────────────────────────── */

const GripIcon = () => (
	<svg viewBox="0 0 12 12" width={12} height={12} fill="currentColor">
		<title>drag</title>
		<circle cx="4" cy="3" r="1" />
		<circle cx="4" cy="6" r="1" />
		<circle cx="4" cy="9" r="1" />
		<circle cx="8" cy="3" r="1" />
		<circle cx="8" cy="6" r="1" />
		<circle cx="8" cy="9" r="1" />
	</svg>
);

const PencilIcon = () => (
	<svg viewBox="0 0 14 14" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
		<title>edit</title>
		<path d="M9 2.5L11.5 5l-7 7H2v-2.5l7-7zM8 3.5L10.5 6" />
	</svg>
);

const TrashIcon = () => (
	<svg viewBox="0 0 14 14" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
		<title>delete</title>
		<path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M3.5 3.5l.5 9a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9l.5-9" />
	</svg>
);

const EyeIcon = () => (
	<svg viewBox="0 0 14 14" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
		<title>show</title>
		<path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
		<circle cx="7" cy="7" r="1.7" />
	</svg>
);

/* ─── Shared icon button style ──────────────────────────────── */

const iconBtn: React.CSSProperties = {
	width: 28,
	height: 28,
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	background: "transparent",
	border: "1px solid transparent",
	borderRadius: "var(--r-sm)",
	color: "var(--ink-mid)",
	cursor: "pointer",
};

const monoCell: React.CSSProperties = {
	fontFamily: "var(--font-mono)",
	fontSize: 12.5,
};

/* ─── Meta ──────────────────────────────────────────────────── */

const meta: Meta<typeof Table> = {
	title: "UI Kit/Table",
	component: Table,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 720, width: "100%" }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof Table>;

/* ─── Variables table (основной use case) ───────────────────── */

const VARS = [
	{ id: "1", name: "BASE_URL",       value: "https://api.example.com", type: "string" },
	{ id: "2", name: "RETRY_COUNT",    value: "3",                       type: "number" },
	{ id: "3", name: "API_SECRET_KEY", value: "sk-live-xxxxxxxxxxx",     type: "secret" },
	{ id: "4", name: "TIMEOUT_MS",     value: "5000",                    type: "number" },
	{ id: "5", name: "DEBUG_MODE",     value: "",                        type: "string" },
] as const;

const TYPE_COLOR: Record<string, string> = {
	string: "var(--green)",
	number: "var(--blue)",
	secret: "var(--red)",
};

const MASKED = "••••••••••";

function VarRow({ name, value, type }: { name: string; value: string; type: string }) {
	const [revealed, setRevealed] = useState(false);
	const isSecret = type === "secret";

	const display = (() => {
		if (value === "") return <span style={{ color: "var(--ink-low)", fontStyle: "italic" }}>пусто</span>;
		if (isSecret && !revealed) return <span style={{ letterSpacing: 2 }}>{MASKED}</span>;
		return value;
	})();

	return (
		<TableRow>
			<TableGrip><GripIcon /></TableGrip>
			<span style={monoCell}>
				<span style={{ color: "var(--ink-low)" }}>{"{{"}</span>
				{name}
				<span style={{ color: "var(--ink-low)" }}>{"}}"}</span>
			</span>
			<span style={{ ...monoCell, color: "var(--ink-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}>
				{display}
				{isSecret && value !== "" && (
					<button
						type="button"
						style={iconBtn}
						aria-label={revealed ? "Скрыть" : "Показать"}
						onClick={() => setRevealed((v) => !v)}
					>
						<EyeIcon />
					</button>
				)}
			</span>
			<StatusBadge label={type} color={TYPE_COLOR[type]} />
			<TableActions>
				<button type="button" style={iconBtn} aria-label="Редактировать"><PencilIcon /></button>
				<button type="button" style={iconBtn} aria-label="Удалить"><TrashIcon /></button>
			</TableActions>
		</TableRow>
	);
}

export const Variables: Story = {
	name: "Variables table",
	render: () => (
		<Table columns="24px 1fr 1.4fr 110px 72px">
			<TableHead>
				<span />
				<span>Имя</span>
				<span>Значение</span>
				<span>Тип</span>
				<span />
			</TableHead>
			{VARS.map((v) => (
				<VarRow key={v.id} {...v} />
			))}
		</Table>
	),
};

/* ─── HTTP Headers table (другой use case) ──────────────────── */

const HEADERS = [
	{ id: "1", key: "Authorization",  value: "Bearer {{API_TOKEN}}",  enabled: true },
	{ id: "2", key: "Content-Type",   value: "application/json",      enabled: true },
	{ id: "3", key: "X-Request-ID",   value: "{{REQUEST_ID}}",        enabled: true },
	{ id: "4", key: "X-Debug-Trace",  value: "1",                     enabled: false },
];

export const Headers: Story = {
	name: "Headers table",
	render: () => (
		<Table columns="24px 1fr 1fr 52px 64px">
			<TableHead>
				<span />
				<span>Ключ</span>
				<span>Значение</span>
				<span>Вкл</span>
				<span />
			</TableHead>
			{HEADERS.map(({ id, key, value, enabled }) => (
				<TableRow key={id} style={{ opacity: enabled ? 1 : 0.45 }}>
					<TableGrip><GripIcon /></TableGrip>
					<span style={monoCell}>{key}</span>
					<span style={{ ...monoCell, color: "var(--ink-mid)" }}>{value}</span>
					<span>
						<StatusBadge
							label={enabled ? "on" : "off"}
							color={enabled ? "var(--green)" : "var(--ink-low)"}
						/>
					</span>
					<TableActions>
						<button type="button" style={iconBtn} aria-label="Редактировать"><PencilIcon /></button>
						<button type="button" style={iconBtn} aria-label="Удалить"><TrashIcon /></button>
					</TableActions>
				</TableRow>
			))}
		</Table>
	),
};

/* ─── Пустое состояние ──────────────────────────────────────── */

export const Empty: Story = {
	render: () => (
		<TableEmpty>
			Переменных ещё нет.{" "}
			<button
				type="button"
				style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--ink)", textDecoration: "underline", cursor: "pointer" }}
			>
				Добавить первую
			</button>
		</TableEmpty>
	),
};

/* ─── StatusBadge ───────────────────────────────────────────── */

export const Badges: Story = {
	name: "StatusBadge variants",
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<StatusBadge label="string" color="var(--green)" />
			<StatusBadge label="number" color="var(--blue)" />
			<StatusBadge label="secret" color="var(--red)" />
			<StatusBadge label="active" color="var(--green)" />
			<StatusBadge label="inactive" color="var(--ink-low)" />
			<StatusBadge label="warning" color="var(--amber)" />
		</div>
	),
};

/* ─── Все состояния вместе ──────────────────────────────────── */

export const Showcase: Story = {
	name: "Full showcase",
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
			<div>
				<p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 500, letterSpacing: "0.6px", textTransform: "uppercase", color: "var(--ink-low)" }}>
					Переменные
				</p>
				<Table columns="24px 1fr 1.4fr 110px 72px">
					<TableHead>
						<span />
						<span>Имя</span>
						<span>Значение</span>
						<span>Тип</span>
						<span />
					</TableHead>
					{VARS.slice(0, 3).map((v) => (
						<VarRow key={v.id} {...v} />
					))}
				</Table>
			</div>

			<div>
				<p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 500, letterSpacing: "0.6px", textTransform: "uppercase", color: "var(--ink-low)" }}>
					Пустое состояние
				</p>
				<TableEmpty>
					Переменных ещё нет.{" "}
					<button
						type="button"
						style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--ink)", textDecoration: "underline", cursor: "pointer" }}
					>
						Добавить первую
					</button>
				</TableEmpty>
			</div>
		</div>
	),
};
