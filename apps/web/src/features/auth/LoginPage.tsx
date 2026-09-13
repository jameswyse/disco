import { loadLoginPage } from "./loadLoginPage";
import { LocalLoginForm } from "./LocalLoginForm";
import { PlexLoginButton } from "./PlexLoginButton";

import styles from "./Login.module.css";

export async function LoginPage() {
  const result = await loadLoginPage();

  if (result.kind === "error") {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.brand}>Disco</p>
          <h1>Sign-in unavailable</h1>
          <p role="alert">{result.message}</p>
          <a className={styles.link} href="/login">
            Try again
          </a>
        </section>
      </main>
    );
  }

  const { localLogin, mediaServerLogin, mediaServerType, applicationUrl } = result.settings;
  const plexLogin = mediaServerLogin && mediaServerType === 1;

  return (
    <main className={styles.page}>
      <section aria-labelledby="login-title" className={styles.card}>
        <p className={styles.brand}>Disco</p>
        <h1 id="login-title">Sign in</h1>
        <p className={styles.note}>Use your Seerr account to browse, request and save titles.</p>
        {plexLogin && <PlexLoginButton />}
        {plexLogin && localLogin && <p className={styles.divider}>or use your email</p>}
        {localLogin && <LocalLoginForm />}
        {!localLogin && !plexLogin && (
          <p role="alert">This Seerr server uses a sign-in provider that Disco does not support.</p>
        )}
        {applicationUrl && (
          <a className={styles.link} href={new URL("login", applicationUrl).href}>
            Manage your account or reset your password in Seerr
          </a>
        )}
      </section>
    </main>
  );
}
