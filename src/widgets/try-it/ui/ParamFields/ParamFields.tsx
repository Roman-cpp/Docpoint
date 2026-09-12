import type { FC } from "react";
import type { Endpoint, Param } from "@/entities/doc-api";
import { extractPathParams } from "@/entities/doc-api";
import { readValue, valueKey } from "../../lib/buildRequest";
import type { ParamValues } from "../../model/tryIt.types";
import { ParamField } from "../ParamField";
import s from "./ParamFields.module.css";

interface ParamFieldsProps {
	endpoint: Endpoint;
	values: ParamValues;
	onChange: (key: string, value: string) => void;
}

/** Поля значений для path- и query-параметров эндпоинта. */
export const ParamFields: FC<ParamFieldsProps> = ({
	endpoint,
	values,
	onChange,
}) => {
	// Перечень сегментов задаёт путь, а описания к ним — схема: сегмент без
	// описания всё равно показывается, иначе его негде было бы заполнить.
	const described = new Map(
		(endpoint.pathParams ?? []).map((param): [string, Param] => [
			param.name,
			param,
		]),
	);
	const pathParams = extractPathParams(endpoint.path);
	const queryParams = endpoint.queryParams ?? [];

	return (
		<>
			{pathParams.length > 0 && (
				<div className={s.group}>
					<div className={s.groupLbl}>Path params</div>
					{pathParams.map((name) => {
						const param = described.get(name);
						return (
							<ParamField
								key={name}
								name={name}
								required={param?.required ?? true}
								type={param?.type}
								placeholder={param?.desc || name}
								value={readValue(values, "path", name, param?.value)}
								onChange={(value) => onChange(valueKey("path", name), value)}
							/>
						);
					})}
				</div>
			)}

			{queryParams.length > 0 && (
				<div className={s.group}>
					<div className={s.groupLbl}>Query params</div>
					{queryParams.map((param) => (
						<ParamField
							key={param.name}
							name={param.name}
							required={param.required}
							type={param.type}
							placeholder={
								param.default ? `default: ${param.default}` : param.desc
							}
							value={readValue(values, "query", param.name, param.value)}
							onChange={(value) =>
								onChange(valueKey("query", param.name), value)
							}
						/>
					))}
				</div>
			)}
		</>
	);
};
