import type { FC } from "react";
import s from "../EnvironmentPage.module.css";
import { Field, Section } from "../parts";

type Props = {
	label: string;
	onLabelChange: (value: string) => void;
	onLabelBlur: () => void;
	statusHint?: string;
};

export const IdentificationSection: FC<Props> = ({
	label,
	onLabelChange,
	onLabelBlur,
	statusHint,
}) => (
	<Section
		title="Идентификация"
		sub="отображается в сайдбаре и в журнале запросов"
		right={
			<span className={s.envSectionSub}>{statusHint ?? "авто-сохранение"}</span>
		}
	>
		<Field
			label={
				<>
					Название<span className={s.req}>*</span>
				</>
			}
			help="короткое читаемое имя"
		>
			<input
				className={`${s.envInput} ${s.sans}`}
				value={label}
				onChange={(e) => onLabelChange(e.target.value)}
				onBlur={onLabelBlur}
				placeholder="Production"
			/>
		</Field>
	</Section>
);
