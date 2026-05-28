import type { ButtonHTMLAttributes, FC, ReactNode } from "react";
import s from "./Button.module.css";

type Variant =
	| "primary"
	| "ghost"
	| "subtle"
	| "danger"
	| "danger-ghost"
	| "icon";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: Variant;
	size?: Size;
	/** Блокирует кнопку и показывает спиннер */
	loading?: boolean;
	/** Иконка слева от текста */
	icon?: ReactNode;
};

const VARIANT_CLASS: Record<Variant, string> = {
	primary: s.primary,
	ghost: s.ghost,
	subtle: s.subtle,
	danger: s.danger,
	"danger-ghost": s.dangerGhost,
	icon: s.icon,
};

const SIZE_CLASS: Record<Size, string> = {
	sm: s.sm,
	md: s.md,
	lg: s.lg,
};

export const Button: FC<Props> = ({
	variant = "ghost",
	size = "md",
	loading = false,
	icon,
	children,
	disabled,
	className,
	...rest
}) => {
	const isIcon = variant === "icon";

	return (
		<button
			type="button"
			disabled={disabled || loading}
			className={[
				s.btn,
				VARIANT_CLASS[variant],
				isIcon ? s.icon : SIZE_CLASS[size],
				className,
			]
				.filter(Boolean)
				.join(" ")}
			{...rest}
		>
			{loading && <span className={s.spinner} aria-hidden />}
			{!loading && icon}
			{children}
		</button>
	);
};
