import { Suspense } from "react";

import { LoginPage } from "@/features/auth/LoginPage";
import { DiscoLoader } from "@/features/feedback/DiscoLoader";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense fallback={<DiscoLoader label="Loading sign-in" size="screen" />}>
      <LoginPage />
    </Suspense>
  );
}
