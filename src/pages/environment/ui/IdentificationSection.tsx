import type { FC } from "react";
import s from "./EnvironmentPage.module.css";
import { Field, Section, SWATCH_COLORS } from "./parts";

type Props = {
	label: string;
	onLabelChange: (value: string) => void;
	onLabelBlur: () => void;
	envTag: string;
	accentColor: string;
	statusHint?: string;
};

export const IdentificationSection: FC<Props> = ({
	label,
	onLabelChange,
	onLabelBlur,
	envTag,
	accentColor,
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
		<Field label="Тег" help="наследуется от типа окружения, нельзя менять">
			<input className={s.envInput} value={envTag} readOnly disabled />
		</Field>
		<Field label="Цвет-маркер" help="определяется по тегу">
			<div className={s.envColorPicker}>
				{SWATCH_COLORS.map((color) => (
					<span
						key={color}
						className={`${s.envColorSwatch} ${color === accentColor ? s.active : ""}`}
						style={{ background: color }}
						title={color}
					/>
				))}
			</div>
		</Field>
	</Section>
);
