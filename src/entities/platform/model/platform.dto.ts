import type { Platform } from "./platform.type";

export type CreatePlatformDTO = Omit<Platform, "id">;

export type UpdatePlatformDTO = Platform;
