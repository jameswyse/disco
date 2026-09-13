"use client";

import { useRef } from "react";

import { updateSettings } from "./actions";
import { defaultPreviewMode } from "./settings";

import type { Settings } from "./settings";

export type LanguageOption = Readonly<{ code: string; label: string }>;

type PreferencesFormProperties = Readonly<{
  settings: Settings;
  languages: readonly LanguageOption[];
  className: string | undefined;
  labelClassName: string | undefined;
  selectClassName: string | undefined;
  noteClassName: string | undefined;
}>;

/** Preferences save as soon as a value changes; there is nothing else to confirm. */
export function PreferencesForm({
  settings,
  languages,
  className,
  labelClassName,
  selectClassName,
  noteClassName,
}: PreferencesFormProperties) {
  const form = useRef<HTMLFormElement>(null);
  const current = languages.find((language) => language.code === settings.defaultLanguage);

  return (
    <form action={updateSettings} className={className} ref={form}>
      <label className={labelClassName}>
        Default language filter
        <select
          className={selectClassName}
          defaultValue={settings.defaultLanguage ?? ""}
          name="defaultLanguage"
          onChange={() => form.current?.requestSubmit()}
        >
          <option value="">Any language</option>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      {/* Rendered from the saved value, so it confirms the preference reached the server. */}
      <small className={noteClassName}>
        {current
          ? `Views open filtered to ${current.label}; pick “Any language” on a view to see everything.`
          : "Views open showing every language."}
      </small>
      <label className={labelClassName}>
        Quick info on posters
        <select
          className={selectClassName}
          defaultValue={settings.previewMode ?? defaultPreviewMode}
          name="previewMode"
          onChange={() => form.current?.requestSubmit()}
        >
          <option value="hover">Opens on hover</option>
          <option value="button">Opens with the ⓘ button</option>
        </select>
      </label>
      <small className={noteClassName}>
        {(settings.previewMode ?? defaultPreviewMode) === "hover"
          ? "Rest the pointer on a poster for a moment to see its details."
          : "Tap or click ⓘ on a poster to see its details; good for touch screens."}
      </small>
    </form>
  );
}
