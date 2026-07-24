/**
 * Which area of the vault a file operation addresses.
 *
 * The vault is laid out per platform, with a folder for each of its services.
 * That layout lives entirely in the backend: callers name the owning entity and
 * the backend resolves it to a directory. A service scope therefore carries no
 * platform id — it is looked up server-side, so moving a service to another
 * platform can never leave the frontend holding a stale path.
 */
export type FileScope =
	| { kind: "platform"; platformId: string }
	| { kind: "service"; serviceId: string };

/** Files owned by a platform itself, shared across its services. */
export const platformScope = (platformId: string): FileScope => ({
	kind: "platform",
	platformId,
});

/** Files owned by a single microservice. */
export const serviceScope = (serviceId: string): FileScope => ({
	kind: "service",
	serviceId,
});

/** Stable identity of a scope. Callers normally build a scope inline, so a new
 *  object arrives on every render — compare and memoise on this instead. */
export const scopeKey = (scope: FileScope): string =>
	scope.kind === "platform"
		? `platform:${scope.platformId}`
		: `service:${scope.serviceId}`;

/** Inverse of [`scopeKey`], for scopes carried in a URL. Returns `null` for
 *  anything that isn't a well-formed key. */
export const parseScopeKey = (key: string): FileScope | null => {
	const separator = key.indexOf(":");
	if (separator === -1) return null;

	const id = key.slice(separator + 1);
	if (!id) return null;

	switch (key.slice(0, separator)) {
		case "platform":
			return platformScope(id);
		case "service":
			return serviceScope(id);
		default:
			return null;
	}
};
