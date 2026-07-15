import type { Platform } from "./platform.entity";

export type CreatePlatformDTO = Omit<Platform, "id">;

export type UpdatePlatformDTO = Platform;
