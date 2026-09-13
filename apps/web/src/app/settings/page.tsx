import { redirect } from "next/navigation";
import { connection } from "next/server";

import { Suspense } from "react";

import Loading from "../loading";

async function ToPreferences(): Promise<null> {
  await connection();
  redirect("/views#preferences");
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ToPreferences />
    </Suspense>
  );
}
