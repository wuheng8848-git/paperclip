// Leaf module — imported by server code and re-exported from package root.
// Keeps `index.ts` able to import `./server` without circular initialization.

export const DEFAULT_CURSOR_LOCAL_MODEL = "auto";

// Cursor CLI is not distributed as an npm package — the official install
// path is the upstream installer script at cursor.com/install. Other adapters
// in this repo prefer `npm install -g <pkg>` which is content-addressed by the
// registry; cursor must use `curl | bash` until upstream publishes a registry
// artifact. Pinning a commit/version here would require shipping our own
// mirror of the installer; revisit if Cursor adds an npm/release-asset
// equivalent.
export const SANDBOX_INSTALL_COMMAND = "curl https://cursor.com/install -fsS | bash";
