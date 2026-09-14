import { Suspense } from "react";

import { PreferencesPage } from "@/features/settings/PreferencesPage";

import Loading from "../loading";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PreferencesPage />
    </Suspense>
  );
}
