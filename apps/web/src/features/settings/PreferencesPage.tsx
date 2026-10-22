import { ContentState } from "@/features/feedback/ContentState";

import { loadPreferences } from "./loadPreferences";
import { PreferencesForm } from "./PreferencesForm";

import styles from "./PreferencesPage.module.css";

export async function PreferencesPage() {
  const { settings, languages } = await loadPreferences();

  return (
    <section aria-labelledby="preferences-heading" className={styles.page}>
      <header className={styles.header}>
        <h1 id="preferences-heading">Preferences</h1>
        <p>Choose how you browse and open title details. Changes save automatically.</p>
      </header>
      {languages.kind === "ok" ? (
        <PreferencesForm languages={languages.options} settings={settings} />
      ) : (
        <ContentState
          title="Preferences couldn’t be loaded"
          message="Check your connection and try again."
          retry
        />
      )}
    </section>
  );
}
