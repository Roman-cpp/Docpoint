import { type FC, useState } from "react";
import type { Variable } from "@/entities/environment";
import s from "./EnvironmentPage.module.css";
import {
	EyeIcon,
	GripIcon,
	inferVarType,
	PencilIcon,
	PlusIcon,
	Section,
	TrashIcon,
	type VarType,
} from "./parts";

type Props = {
	variables: Variable[];
	onAdd: () => void;
	onEdit: (variable: Variable) => void;
	onDelete: (variable: Variable) => void;
};

type RowProps = {
	variable: Variable;
	onEdit: () => void;
	onDelete: () => void;
};

const MASKED = "••••••••••";

const VarRow: FC<RowProps> = ({ variable, onEdit, onDelete }) => {
	const type: VarType = inferVarType(variable.name, variable.value);
	const isSecret = type === "secret";
	const [revealed, setRevealed] = useState(false);

	const display = (() => {
		if (variable.value === "") return <span className={s.varEmpty}>пусто</span>;
		if (isSecret && !revealed)
			return <span className={s.masked}>{MASKED}</span>;
		return variable.value;
	})();

	return (
		<div className={s.envVarsRow}>
			<span className={s.envVarsGrip}>
				<GripIcon />
			</span>
			<span className={s.envVarsName}>
				<span className={s.pre}>{"{{"}</span>
				{variable.name}
				<span className={s.pre}>{"}}"}</span>
			</span>
			<span className={`${s.envVarsVal} ${isSecret ? s.secret : ""}`}>
				{display}
				{isSecret && variable.value !== "" && (
					<button
						type="button"
						className={s.envIconbtn}
						aria-label={revealed ? "Скрыть" : "Показать"}
						onClick={() => setRevealed((v) => !v)}
					>
						<EyeIcon />
					</button>
				)}
			</span>
			<span className={`${s.envVarsType} ${s[type]}`}>
				<span className={s.envVarsTypeDot} />
				{type}
			</span>
			<span className={s.envVarsActions}>
				<button
					type="button"
					className={s.envIconbtn}
					aria-label="Редактировать"
					onClick={onEdit}
				>
					<PencilIcon />
				</button>
				<button
					type="button"
					className={s.envIconbtn}
					aria-label="Удалить"
					onClick={onDelete}
				>
					<TrashIcon />
				</button>
			</span>
		</div>
	);
};

export const VariablesSection: FC<Props> = ({
	variables,
	onAdd,
	onEdit,
	onDelete,
}) => (
	<Section
		title="Переменные"
		sub={
			<>
				подставляются в URL, headers и body как <code>{"{{NAME}}"}</code>
			</>
		}
		right={
			<button
				type="button"
				className={`${s.envBtn} ${s.envBtnGhost}`}
				onClick={onAdd}
			>
				<PlusIcon />
				Новая
			</button>
		}
	>
		{variables.length === 0 ? (
			<div className={s.envVarsEmpty}>
				Переменных ещё нет.{" "}
				<button type="button" className={s.envVarsEmptyLink} onClick={onAdd}>
					Добавить первую
				</button>
			</div>
		) : (
			<div className={s.envVars}>
				<div className={`${s.envVarsRow} ${s.head}`}>
					<span />
					<span>Имя</span>
					<span>Значение</span>
					<span>Тип</span>
					<span />
				</div>
				{variables.map((v) => (
					<VarRow
						key={v.id}
						variable={v}
						onEdit={() => onEdit(v)}
						onDelete={() => onDelete(v)}
					/>
				))}
			</div>
		)}
	</Section>
);
