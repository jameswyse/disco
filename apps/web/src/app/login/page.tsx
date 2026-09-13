import { Suspense } from "react";

import { LoginPage } from "@/features/auth/LoginPage";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading sign-in…</p>}>
      <LoginPage />
    </Suspense>
  );
}
