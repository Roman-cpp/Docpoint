/**
 * Markdown file holding the long-form description of a platform. It lives in
 * the platform's own file scope, so the vault browser, viewer and editor all
 * work on it unchanged. The backend seeds it when the platform is created —
 * see `service/vault/provision.rs`, which must name the same file.
 */
export const PLATFORM_DESCRIPTION_FILE = "README.md";
