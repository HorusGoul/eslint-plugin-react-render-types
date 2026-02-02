import type { TSESLint } from "@typescript-eslint/utils";

export interface PluginSettings {
  additionalTransparentComponents?: string[];
}

/**
 * Read plugin-specific settings from context.settings["react-render-types"].
 */
export function getPluginSettings(
  settings: TSESLint.SharedConfigurationSettings
): PluginSettings {
  const raw = (settings?.["react-render-types"] ?? {}) as Record<
    string,
    unknown
  >;

  let additionalTransparentComponents: string[] | undefined;
  if (Array.isArray(raw.additionalTransparentComponents)) {
    additionalTransparentComponents =
      raw.additionalTransparentComponents.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      );
  }

  return { additionalTransparentComponents };
}
