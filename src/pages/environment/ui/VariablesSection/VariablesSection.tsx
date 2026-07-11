import { type FC, useState } from "react";
import type { Variable } from "@/entities/environment";
import {
	StatusBadge,
	Table,
	TableActions,
	TableEmpty,
	TableGrip,
	TableHead,
	TableRow,
} from "@/shared/ui-kit/data-display";
import s from "../EnvironmentPage.module.css";
import {
	EyeIcon,
	GripIcon,
	inferVarType,
	PencilIcon,
	PlusIcon,
	Section,
	TrashIcon,
	type VarType,
} from "../parts";

const VAR_TYPE_COLOR: Record<VarType, string> = {
	string: "var(--green)",
	number: "var(--blue)",
	secret: "var(--red)",
};

const COLS = "24px 1fr 1.4fr 110px 72px";

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
		<TableRow>
			<TableGrip>
				<GripIcon />
			</TableGrip>
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
			<StatusBadge label={type} color={VAR_TYPE_COLOR[type]} />
			<TableActions>
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
			</TableActions>
		</TableRow>
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
			<TableEmpty>
				Переменных ещё нет.{" "}
				<button type="button" className={s.envVarsEmptyLink} onClick={onAdd}>
					Добавить первую
				</button>
			</TableEmpty>
		) : (
			<Table columns={COLS}>
				<TableHead>
					<span />
					<span>Имя</span>
					<span>Значение</span>
					<span>Тип</span>
					<span />
				</TableHead>
				{variables.map((v) => (
					<VarRow
						key={v.id}
						variable={v}
						onEdit={() => onEdit(v)}
						onDelete={() => onDelete(v)}
					/>
				))}
			</Table>
		)}
	</Section>
);
