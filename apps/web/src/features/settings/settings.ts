import { Schema } from "effect";

/** User preferences that apply across the app. */
export const PreviewMode = Schema.Literal("hover", "button");
export type PreviewMode = typeof PreviewMode.Type;

export const Settings = Schema.Struct({
  /** ISO 639-1 code applied as the original-language filter when a URL does not name one. */
  defaultLanguage: Schema.optional(Schema.String),
  /** How the quick-info card on grid posters opens. */
  previewMode: Schema.optional(PreviewMode),
});
export type Settings = typeof Settings.Type;

export const defaultPreviewMode: PreviewMode = "hover";
/** Settings under construction, before they are frozen into the saved file. */
export type MutableSettings = { -readonly [Key in keyof Settings]: Settings[Key] };

export const defaultSettings: Settings = {};
