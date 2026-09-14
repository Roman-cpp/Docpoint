import type { CSSProperties, FC, ReactNode } from "react";
import s from "./Table.module.css";

/* ─── Table ─────────────────────────────────────────────────── */

type TableProps = {
	/** CSS grid-template-columns value, e.g. "24px 1fr 110px 72px" */
	columns: string;
	children: ReactNode;
	className?: string;
};

export const Table: FC<TableProps> = ({ columns, children, className }) => (
	<div
		className={[s.table, className].filter(Boolean).join(" ")}
		style={{ "--table-cols": columns } as CSSProperties}
	>
		{children}
	</div>
);

/* ─── TableHead ─────────────────────────────────────────────── */

type RowProps = {
	children: ReactNode;
	className?: string;
};

export const TableHead: FC<RowProps> = ({ children, className }) => (
	<div className={[s.row, s.head, className].filter(Boolean).join(" ")}>
		{children}
	</div>
);

/* ─── TableRow ──────────────────────────────────────────────── */

export const TableRow: FC<RowProps> = ({ children, className }) => (
	<div className={[s.row, className].filter(Boolean).join(" ")}>{children}</div>
);

/* ─── TableGrip ─────────────────────────────────────────────── */

type GripProps = { children: ReactNode };

export const TableGrip: FC<GripProps> = ({ children }) => (
	<span className={s.grip}>{children}</span>
);

/* ─── TableActions ──────────────────────────────────────────── */

export const TableActions: FC<{ children: ReactNode }> = ({ children }) => (
	<span className={s.actions}>{children}</span>
);

/* ─── StatusBadge ───────────────────────────────────────────── */

type StatusBadgeProps = {
	label: string;
	/** CSS color value for the dot */
	color?: string;
	className?: string;
};

export const StatusBadge: FC<StatusBadgeProps> = ({
	label,
	color,
	className,
}) => (
	<span className={[s.badge, className].filter(Boolean).join(" ")}>
		<span
			className={s.badgeDot}
			style={color ? { background: color } : undefined}
		/>
		{label}
	</span>
);

/* ─── TableEmpty ────────────────────────────────────────────── */

export const TableEmpty: FC<{ children: ReactNode; className?: string }> = ({
	children,
	className,
}) => (
	<div className={[s.empty, className].filter(Boolean).join(" ")}>
		{children}
	</div>
);
