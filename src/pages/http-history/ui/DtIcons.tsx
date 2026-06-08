import type { FC, SVGProps } from "react";
import { cx } from "@/shared/lib/cx";
import s from "./DataTable.module.css";

/* ─── Icons (14×14, stroke 1.5 — matches Docpoint set) ─── */
export const DtBase: FC<SVGProps<SVGSVGElement> & { size?: number }> = ({
	children,
	size = 14,
	...rest
}) => (
	<svg
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...rest}
	>
		{children}
	</svg>
);
export const DtCheck: FC<{ size?: number }> = ({ size = 11 }) => (
	<DtBase size={size}>
		<path d="M2.5 7.5L5.5 10.5 11.5 4" />
	</DtBase>
);
export const DtDash: FC<{ size?: number }> = ({ size = 11 }) => (
	<DtBase size={size}>
		<path d="M3 7h8" />
	</DtBase>
);
export const DtCaret: FC<{ size?: number }> = ({ size = 11 }) => (
	<DtBase size={size}>
		<path d="M3.5 5.5L7 9l3.5-3.5" />
	</DtBase>
);
export const DtSort: FC<{ size?: number }> = ({ size = 11 }) => (
	<DtBase size={size}>
		<path d="M4 5.5L7 2.5 10 5.5M4 8.5L7 11.5 10 8.5" />
	</DtBase>
);
export const DtSearch: FC<{ size?: number }> = ({ size = 14 }) => (
	<DtBase size={size}>
		<circle cx="6" cy="6" r="4" />
		<path d="M9 9l3.5 3.5" />
	</DtBase>
);
export const DtChevL: FC<{ size?: number }> = ({ size = 12 }) => (
	<DtBase size={size}>
		<path d="M8.5 3.5L5 7l3.5 3.5" />
	</DtBase>
);
export const DtChevR: FC<{ size?: number }> = ({ size = 12 }) => (
	<DtBase size={size}>
		<path d="M5.5 3.5L9 7l-3.5 3.5" />
	</DtBase>
);

/* ─── Checkbox ─── */
interface DtCheckboxProps {
	checked: boolean;
	indeterminate?: boolean;
	onChange: () => void;
	label: string;
}
export const DtCheckbox: FC<DtCheckboxProps> = ({
	checked,
	indeterminate,
	onChange,
	label,
}) => {
	const cls = indeterminate ? s.indeterminate : checked ? s.checked : undefined;
	return (
		<button
			type="button"
			className={cx(s["dt-cb"], cls)}
			role="checkbox"
			aria-checked={indeterminate ? "mixed" : checked}
			aria-label={label}
			onClick={(e) => {
				e.stopPropagation();
				onChange();
			}}
		>
			{indeterminate ? <DtDash /> : checked ? <DtCheck /> : null}
		</button>
	);
};
