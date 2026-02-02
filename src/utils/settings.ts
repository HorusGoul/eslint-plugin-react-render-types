import type { TSESLint } from "@typescript-eslint/utils";

/**
 * Parsed plugin settings.
 * transparentComponentsMap: component name → set of prop names to extract JSX from.
 */
export interface PluginSettings {
  transparentComponentsMap: Map<string, Set<string>>;
}

/**
 * Object format for additionalTransparentComponents setting.
 */
interface TransparentComponentEntry {
  name: string;
  props: string[];
}

function isTransparentComponentEntry(
  value: unknown
): value is TransparentComponentEntry {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.name === "string" &&
    obj.name.length > 0 &&
    Array.isArray(obj.props) &&
    obj.props.every((p) => typeof p === "string" && p.length > 0)
  );
}

/**
 * Read plugin-specific settings from context.settings["react-render-types"].
 *
 * additionalTransparentComponents accepts:
 *   - string entries: treated as { name: value, props: ["children"] }
 *   - object entries: { name: string; props: string[] }
 */
export function getPluginSettings(
  settings: TSESLint.SharedConfigurationSettings
): PluginSettings {
  const raw = (settings?.["react-render-types"] ?? {}) as Record<
    string,
    unknown
  >;

  const map = new Map<string, Set<string>>();

  if (Array.isArray(raw.additionalTransparentComponents)) {
    for (const item of raw.additionalTransparentComponents) {
      if (typeof item === "string" && item.length > 0) {
        // String shorthand → defaults to children
        map.set(item, new Set(["children"]));
      } else if (isTransparentComponentEntry(item)) {
        map.set(item.name, new Set(item.props));
      }
    }
  }

  return { transparentComponentsMap: map };
}
