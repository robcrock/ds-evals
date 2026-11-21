import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { systemPrompt } from "./task.ts";
import type { Agent } from "./types.ts";

export function createPiAgent(cwd: string): Agent {
  return {
    async complete(prompt: string) {
      const settingsManager = SettingsManager.inMemory();
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir: getAgentDir(),
        settingsManager,
        noExtensions: true,
        noSkills: true,
        noPromptTemplates: true,
        noThemes: true,
        noContextFiles: true,
        systemPromptOverride: () => systemPrompt(),
        appendSystemPromptOverride: () => [],
        agentsFilesOverride: () => ({ agentsFiles: [] }),
        skillsOverride: () => ({ skills: [], diagnostics: [] }),
      });
      await loader.reload();

      const { session } = await createAgentSession({
        cwd,
        resourceLoader: loader,
        sessionManager: SessionManager.inMemory(),
        settingsManager,
        thinkingLevel: "low",
        noTools: "all",
      });

      try {
        await session.prompt(prompt);
        return {
          response: session.getLastAssistantText() ?? "",
          modelId: modelIdOf(session.model),
        };
      } catch (error) {
        return {
          response: "",
          modelId: modelIdOf(session.model),
          error: error instanceof Error ? error.message : String(error),
        };
      } finally {
        session.dispose();
      }
    },
  };
}

function modelIdOf(model: { provider?: string; id?: string } | null | undefined): string {
  if (!model?.id) return "";
  return model.provider ? `${model.provider}/${model.id}` : model.id;
}
