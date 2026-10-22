"use client";

import Image from "next/image";

import { useId, useRef } from "react";

import { viewArtwork } from "@/features/views/viewArtwork";

import { updateSettings } from "./actions";
import { defaultLogoStyle, defaultPreviewMode, defaultSidebarStyle } from "./settings";

import type { ReactNode } from "react";

import type { View } from "@/features/views/views";

import type { LogoStyle, Settings, SidebarStyle } from "./settings";

import styles from "./PreferencesForm.module.css";

export type LanguageOption = Readonly<{ code: string; label: string }>;

type PreferencesFormProperties = Readonly<{
  settings: Settings;
  languages: readonly LanguageOption[];
}>;

type Choice<Value extends string> = Readonly<{ value: Value; label: string; note: string }>;

const sidebarStyleChoices: readonly Choice<SidebarStyle>[] = [
  { value: "small", label: "Small", note: "Icons and names" },
  { value: "medium", label: "Medium", note: "Short artwork cards" },
  { value: "large", label: "Large", note: "Large artwork cards" },
];

const logoStyleChoices: readonly Choice<LogoStyle>[] = [
  { value: "monochrome", label: "Monochrome", note: "White logos on dark cards" },
  { value: "color", label: "Colour", note: "Brand colours on light cards" },
];

const logoSamples: readonly View[] = [
  { id: "netflix", label: "Netflix", source: { kind: "provider", providerId: 8 } },
  { id: "apple-tv", label: "Apple TV", source: { kind: "provider", providerId: 350 } },
];

const sidebarSampleCount = 8;

function SidebarStylePreview({ sidebarStyle }: Readonly<{ sidebarStyle: SidebarStyle }>) {
  return (
    <span aria-hidden="true" className={`${styles.sidebarPreview} ${styles[sidebarStyle]}`}>
      {Array.from({ length: sidebarSampleCount }, (_, index) => (
        <span className={styles.sampleView} key={index}>
          <span className={styles.sampleText} />
        </span>
      ))}
    </span>
  );
}

function LogoStylePreview({ logoStyle }: Readonly<{ logoStyle: LogoStyle }>) {
  return (
    <span aria-hidden="true" className={styles.logoPreview}>
      {logoSamples.map((view) => {
        const artwork = viewArtwork(view, logoStyle);

        return (
          <span
            className={styles.sampleCard}
            key={view.id}
            style={{ background: artwork.background }}
          >
            {artwork.logo.kind === "none" ? null : (
              <Image
                alt=""
                className={styles.sampleLogo}
                draggable={false}
                height={40}
                src={artwork.logo.src}
                unoptimized
                width={100}
              />
            )}
          </span>
        );
      })}
    </span>
  );
}

type ChoiceGroupProperties<Value extends string> = Readonly<{
  legend: string;
  description: string | undefined;
  name: string;
  choices: readonly Choice<Value>[];
  choicesClassName: string | undefined;
  selected: Value;
  onChange: () => void;
  renderPreview: (value: Value) => ReactNode;
}>;

function ChoiceGroup<Value extends string>({
  legend,
  description,
  name,
  choices,
  choicesClassName,
  selected,
  onChange,
  renderPreview,
}: ChoiceGroupProperties<Value>) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <fieldset
      aria-describedby={description === undefined ? undefined : descriptionId}
      className={styles.choiceGroup}
    >
      <legend className={styles.legend}>{legend}</legend>
      {description === undefined ? null : (
        <p className={styles.groupDescription} id={descriptionId}>
          {description}
        </p>
      )}
      <div className={`${styles.choices} ${choicesClassName ?? ""}`}>
        {choices.map((choice) => (
          <label className={styles.choice} key={choice.value}>
            <input
              aria-describedby={`${id}-${choice.value}-note`}
              aria-labelledby={`${id}-${choice.value}-label`}
              className={styles.choiceInput}
              defaultChecked={choice.value === selected}
              name={name}
              onChange={onChange}
              type="radio"
              value={choice.value}
            />
            {renderPreview(choice.value)}
            <span className={styles.choiceLabel} id={`${id}-${choice.value}-label`}>
              {choice.label}
            </span>
            <span className={styles.choiceNote} id={`${id}-${choice.value}-note`}>
              {choice.note}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PreferencesForm({ settings, languages }: PreferencesFormProperties) {
  const form = useRef<HTMLFormElement>(null);
  const current = languages.find((language) => language.code === settings.defaultLanguage);
  const save = () => form.current?.requestSubmit();

  return (
    <form
      action={updateSettings}
      className={styles.preferences}
      onReset={(event) => {
        event.preventDefault();
      }}
      ref={form}
    >
      <label className={styles.preference}>
        Default language filter
        <select
          className={styles.select}
          defaultValue={settings.defaultLanguage ?? ""}
          name="defaultLanguage"
          onChange={save}
        >
          <option value="">Any language</option>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      <small className={styles.note}>
        {current
          ? `Views open filtered to ${current.label}; pick “Any language” on a view to see everything.`
          : "Views open showing every language."}
      </small>
      <label className={styles.preference}>
        Quick info on posters
        <select
          className={styles.select}
          defaultValue={settings.previewMode ?? defaultPreviewMode}
          name="previewMode"
          onChange={save}
        >
          <option value="hover">Opens on hover</option>
          <option value="button">Opens with the ⓘ button</option>
        </select>
      </label>
      <small className={styles.note}>
        {(settings.previewMode ?? defaultPreviewMode) === "hover"
          ? "Rest the pointer on a poster for a moment to see its details."
          : "Tap or click ⓘ on a poster to see its details; good for touch screens."}
      </small>
      <ChoiceGroup
        choices={sidebarStyleChoices}
        choicesClassName={styles.compactChoices}
        description={undefined}
        legend="Sidebar style"
        name="sidebarStyle"
        onChange={save}
        renderPreview={(value) => <SidebarStylePreview sidebarStyle={value} />}
        selected={settings.sidebarStyle ?? defaultSidebarStyle}
      />
      <ChoiceGroup
        choices={logoStyleChoices}
        choicesClassName={undefined}
        description="Streaming service, network and studio wordmarks on medium and large sidebar cards and in Manage views."
        legend="Logo style"
        name="logoStyle"
        onChange={save}
        renderPreview={(value) => <LogoStylePreview logoStyle={value} />}
        selected={settings.logoStyle ?? defaultLogoStyle}
      />
    </form>
  );
}
