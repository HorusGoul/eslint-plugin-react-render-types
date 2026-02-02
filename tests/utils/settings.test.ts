import { describe, it, expect } from "vitest";
import { getPluginSettings } from "../../src/utils/settings.js";

describe("getPluginSettings", () => {
  it("returns empty settings when no plugin settings exist", () => {
    const result = getPluginSettings({});
    expect(result.additionalTransparentComponents).toBeUndefined();
  });

  it("returns empty settings when plugin key exists but is empty", () => {
    const result = getPluginSettings({ "react-render-types": {} });
    expect(result.additionalTransparentComponents).toBeUndefined();
  });

  it("parses additionalTransparentComponents array", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: ["Suspense", "ErrorBoundary"],
      },
    });
    expect(result.additionalTransparentComponents).toEqual([
      "Suspense",
      "ErrorBoundary",
    ]);
  });

  it("filters out non-string and empty values", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: [
          "Suspense",
          42,
          null,
          "",
          "ErrorBoundary",
        ],
      },
    });
    expect(result.additionalTransparentComponents).toEqual([
      "Suspense",
      "ErrorBoundary",
    ]);
  });

  it("handles member expression format", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: ["React.Suspense"],
      },
    });
    expect(result.additionalTransparentComponents).toEqual([
      "React.Suspense",
    ]);
  });

  it("ignores non-array additionalTransparentComponents", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: "Suspense",
      },
    });
    expect(result.additionalTransparentComponents).toBeUndefined();
  });
});
