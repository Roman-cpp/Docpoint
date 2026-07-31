import type { FC } from "react";
import type { Endpoint } from "@/entities/doc-api";
import { extractPathParams, readValue, valueKey } from "../../lib/buildRequest";
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
	const pathParams = extractPathParams(endpoint.path);
	const queryParams = endpoint.queryParams ?? [];

	return (
		<>
			{pathParams.length > 0 && (
				<div className={s.group}>
					<div className={s.groupLbl}>Path params</div>
					{pathParams.map((name) => (
						<ParamField
							key={name}
							name={name}
							required
							placeholder={name}
							value={readValue(values, "path", name)}
							onChange={(value) => onChange(valueKey("path", name), value)}
						/>
					))}
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
