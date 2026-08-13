import {
	type FC,
	type InputHTMLAttributes,
	type ReactNode,
	useState,
} from "react";
import { EyeIcon, EyeOffIcon } from "@/shared/svg";
import s from "./Input.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> & {
	size?: "sm" | "default" | "md";
	sans?: boolean;
	error?: boolean;
	prefix?: ReactNode;
	suffix?: ReactNode;
	onSuffixClick?: () => void;
};

export const Input: FC<Props> = ({
	size = "default",
	sans,
	error,
	prefix,
	suffix,
	onSuffixClick,
	className,
	type = "text",
	...rest
}) => {
	const [showPass, setShowPass] = useState(false);

	const isPassword = type === "password";
	const inputType = isPassword ? (showPass ? "text" : "password") : type;

	const wrapCls = [
		s.wrap,
		size === "sm" ? s.sm : size === "md" ? s.md : "",
		error ? s.error : "",
		prefix ? s.hasPre : "",
		suffix || isPassword ? s.hasSuf : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={wrapCls}>
			{prefix && <span className={s.prefix}>{prefix}</span>}
			<input
				{...rest}
				type={inputType}
				className={[s.input, sans ? s.sans : "", className ?? ""]
					.filter(Boolean)
					.join(" ")}
			/>
			{isPassword ? (
				<button
					type="button"
					className={`${s.suffix} ${s.suffixBtn}`}
					onClick={() => setShowPass((v) => !v)}
					tabIndex={-1}
				>
					{showPass ? <EyeOffIcon /> : <EyeIcon size={13} />}
				</button>
			) : suffix ? (
				onSuffixClick ? (
					<button
						type="button"
						className={`${s.suffix} ${s.suffixBtn}`}
						onClick={onSuffixClick}
						tabIndex={-1}
					>
						{suffix}
					</button>
				) : (
					<span className={s.suffix}>{suffix}</span>
				)
			) : null}
		</div>
	);
};
