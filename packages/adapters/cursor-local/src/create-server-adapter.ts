import type { AdapterRuntimeCommandSpec, ServerAdapterModule } from "@paperclipai/adapter-utils";
import { agentConfigurationDoc, modelProfiles, type } from "./index.js";
import { models } from "./model-catalog.js";
import { normalizeConfiguredCommand } from "./command-normalize.js";
import {
  execute,
  listCursorSkills,
  listCursorModels,
  sessionCodec,
  syncCursorSkills,
  testEnvironment,
} from "./server/index.js";

/**
 * Server-only entry: dynamic adapter loading resolves this file via
 * `package.json → paperclip.adapterServerEntry` so the package root `index.ts`
 * can stay browser-safe (UI imports `@paperclipai/adapter-cursor-local` for
 * defaults without pulling Node-only code into Vite).
 */
function readConfiguredCommand(config: Record<string, unknown>, fallback: string): string {
  const value = normalizeConfiguredCommand(typeof config.command === "string" ? config.command : "", fallback);
  return value.length > 0 ? value : fallback;
}

function buildCursorRuntimeCommandSpec(config: Record<string, unknown>): AdapterRuntimeCommandSpec {
  const command = readConfiguredCommand(config, "agent");
  return {
    command,
    detectCommand: command,
    installCommand: null,
  };
}

export function createServerAdapter(): ServerAdapterModule {
  return {
    type,
    execute,
    testEnvironment,
    listSkills: listCursorSkills,
    syncSkills: syncCursorSkills,
    sessionCodec,
    models,
    modelProfiles,
    listModels: listCursorModels,
    getRuntimeCommandSpec: buildCursorRuntimeCommandSpec,
    agentConfigurationDoc,
    supportsLocalAgentJwt: true,
    supportsInstructionsBundle: true,
    instructionsPathKey: "instructionsFilePath",
    requiresMaterializedRuntimeSkills: true,
  };
}
