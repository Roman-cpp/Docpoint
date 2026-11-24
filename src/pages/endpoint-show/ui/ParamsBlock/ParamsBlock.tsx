import type { FC } from "react";
import { cx } from "@/shared/lib/cx";
import type { DocParam } from "../../lib/doc-param";
import { DocChip } from "../DocChip";
import { SectionHead } from "../SectionHead";
import s from "./ParamsBlock.module.css";

interface ParamsBlockProps {
	title: string;
	hint?: string;
	params: DocParam[];
	/**
	 * Сегменты пути. У них не показываются ни тип, ни обязательность: сегмент
	 * стоит в самом адресе, и как его подставить, видно по `/orders/{order_id}`
	 * без единой пометки. Остаётся то, чего адрес не говорит, — описание.
	 */
	segments?: boolean;
	onEdit?: () => void;
}

/** Одна строка таблицы: слева имя и тип, справа описание и всё остальное. */
const ParamRow: FC<{ param: DocParam; segments: boolean }> = ({
	param,
	segments,
}) => {
	// У сегмента строка меток может остаться пустой — тогда её просто нет.
	const marks = !segments || param.format || param.nullable || param.deprecated;

	return (
		<div className={s.row}>
			<div className={s.head}>
				<span className={cx(s.name, param.deprecated && s.deprecated)}>
					{param.name}
				</span>
				{!segments &&
					(param.required ? (
						<span className={s.required} title="Обязательный параметр">
							*
						</span>
					) : (
						<span className={s.optional}>необяз.</span>
					))}
			</div>

			<div className={s.body}>
				{marks && (
					<div className={s.types}>
						{!segments && (
							<DocChip tone="muted" mono>
								{param.type}
							</DocChip>
						)}
						{param.format && (
							<DocChip tone="muted" mono label="формат">
								{param.format}
							</DocChip>
						)}
						{param.nullable && <DocChip tone="muted">nullable</DocChip>}
						{param.deprecated && <DocChip tone="warn">устарел</DocChip>}
					</div>
				)}

				{param.desc ? (
					<p className={s.desc}>{param.desc}</p>
				) : (
					<p className={cx(s.desc, s.descEmpty)}>Без описания</p>
				)}

				{param.enumValues && param.enumValues.length > 0 && (
					<div className={s.meta}>
						<span className={s.metaLabel}>Допустимые значения</span>
						{param.enumValues.map((value) => (
							<DocChip key={value} tone="accent" mono>
								{value}
							</DocChip>
						))}
					</div>
				)}

				{(param.default || param.example || param.constraints) && (
					<div className={s.meta}>
						{param.default && (
							<DocChip tone="neutral" mono label="по умолчанию">
								{param.default}
							</DocChip>
						)}
						{param.example && (
							<DocChip tone="neutral" mono label="пример">
								{param.example}
							</DocChip>
						)}
						{param.constraints?.map((rule) => (
							<DocChip key={rule} tone="neutral" mono>
								{rule}
							</DocChip>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

/**
 * Блок параметров одного вида: сегменты пути, строка запроса, поля тела.
 * Вид у всех один, поэтому глаз не перестраивается между секциями, а
 * заголовок говорит, где именно эти значения окажутся в запросе.
 */
export const ParamsBlock: FC<ParamsBlockProps> = ({
	title,
	hint,
	params,
	segments = false,
	onEdit,
}) => (
	<div className={s.block}>
		<SectionHead
			title={title}
			count={params.length}
			hint={hint}
			onEdit={onEdit}
		/>
		<div className={s.table}>
			{params.map((param) => (
				<ParamRow key={param.name} param={param} segments={segments} />
			))}
		</div>
	</div>
);
