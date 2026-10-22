import { Schema } from "effect";

export const PreviewMode = Schema.Literals(["hover", "button"]);
export type PreviewMode = typeof PreviewMode.Type;

export const SidebarStyle = Schema.Literals(["large", "medium", "small"]);
export type SidebarStyle = typeof SidebarStyle.Type;
export const defaultSidebarStyle: SidebarStyle = "small";

export const LogoStyle = Schema.Literals(["monochrome", "color"]);
export type LogoStyle = typeof LogoStyle.Type;
export const defaultLogoStyle: LogoStyle = "monochrome";

export const Settings = Schema.Struct({
  defaultLanguage: Schema.optional(Schema.String),
  previewMode: Schema.optional(PreviewMode),
  sidebarStyle: Schema.optional(SidebarStyle),
  logoStyle: Schema.optional(LogoStyle),
});
export type Settings = typeof Settings.Type;

export const defaultPreviewMode: PreviewMode = "hover";

export type MutableSettings = { -readonly [Key in keyof Settings]: Settings[Key] };

export const defaultSettings: Settings = {};
