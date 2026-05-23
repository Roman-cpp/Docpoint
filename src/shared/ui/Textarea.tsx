import type { FC, TextareaHTMLAttributes } from "react";
import s from "./Textarea.module.css";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	sans?: boolean;
	error?: boolean;
};

export const Textarea: FC<Props> = ({ sans, error, className, ...rest }) => (
	<textarea
		{...rest}
		className={[
			s.textarea,
			sans ? s.sans : "",
			error ? s.error : "",
			className ?? "",
		]
			.filter(Boolean)
			.join(" ")}
	/>
);
