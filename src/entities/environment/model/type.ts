import type { EnvironmentAuth } from "@/entities/environment-auth";

export interface Variable {
  id: string;
  name: string;
  value: string;
}

export interface Environment {
	id: string;
	env: string;
	label: string;
	baseUrl: string;
  prefix: string;
  value: Variable[];
  auth: EnvironmentAuth;
}

export type CreateEnvironmentDTO = Omit<Environment, "id" | "auth">;

export type UpdateEnvironmentDTO = {
  id: string;
  label: string;
  baseUrl: string;
  prefix: string;
};

export type CreateVariableDTO = {
  name: string;
  value: string;
};

export type UpdateVariableDTO = Variable;
