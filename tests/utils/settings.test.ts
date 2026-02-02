import { describe, it, expect } from "vitest";
import { getPluginSettings } from "../../src/utils/settings.js";

describe("getPluginSettings", () => {
  it("returns empty map when no plugin settings exist", () => {
    const result = getPluginSettings({});
    expect(result.transparentComponentsMap.size).toBe(0);
  });

  it("returns empty map when plugin key exists but is empty", () => {
    const result = getPluginSettings({ "react-render-types": {} });
    expect(result.transparentComponentsMap.size).toBe(0);
  });

  it("parses string entries as children-only transparent components", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: ["Suspense", "ErrorBoundary"],
      },
    });
    expect(result.transparentComponentsMap.size).toBe(2);
    expect(result.transparentComponentsMap.get("Suspense")).toEqual(
      new Set(["children"])
    );
    expect(result.transparentComponentsMap.get("ErrorBoundary")).toEqual(
      new Set(["children"])
    );
  });

  it("parses object entries with named props", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: [
          { name: "Flag", props: ["off", "children"] },
        ],
      },
    });
    expect(result.transparentComponentsMap.size).toBe(1);
    expect(result.transparentComponentsMap.get("Flag")).toEqual(
      new Set(["off", "children"])
    );
  });

  it("handles mixed string and object entries", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: [
          "Suspense",
          { name: "Flag", props: ["off", "children"] },
          "ErrorBoundary",
        ],
      },
    });
    expect(result.transparentComponentsMap.size).toBe(3);
    expect(result.transparentComponentsMap.get("Suspense")).toEqual(
      new Set(["children"])
    );
    expect(result.transparentComponentsMap.get("Flag")).toEqual(
      new Set(["off", "children"])
    );
    expect(result.transparentComponentsMap.get("ErrorBoundary")).toEqual(
      new Set(["children"])
    );
  });

  it("filters out invalid entries (non-string, empty, bad objects)", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: [
          "Suspense",
          42,
          null,
          "",
          { name: "" },
          { name: "Bad", props: "not-array" },
          { name: "AlsoBad" },
          "ErrorBoundary",
        ],
      },
    });
    expect(result.transparentComponentsMap.size).toBe(2);
    expect(result.transparentComponentsMap.has("Suspense")).toBe(true);
    expect(result.transparentComponentsMap.has("ErrorBoundary")).toBe(true);
  });

  it("handles member expression format", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: ["React.Suspense"],
      },
    });
    expect(result.transparentComponentsMap.get("React.Suspense")).toEqual(
      new Set(["children"])
    );
  });

  it("ignores non-array additionalTransparentComponents", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: "Suspense",
      },
    });
    expect(result.transparentComponentsMap.size).toBe(0);
  });

  it("filters out object entries with empty props array items", () => {
    const result = getPluginSettings({
      "react-render-types": {
        additionalTransparentComponents: [
          { name: "Flag", props: ["off", "", "children"] },
        ],
      },
    });
    // Empty string prop causes the entry to be rejected
    expect(result.transparentComponentsMap.size).toBe(0);
  });
});
