import { redirect } from "next/navigation";
import { connection } from "next/server";

import { Suspense } from "react";

import { loadViews } from "@/features/views/loadViews";

import Loading from "./loading";

async function FirstView(): Promise<null> {
  await connection();
  const [firstView] = await loadViews();

  redirect(firstView ? `/${firstView.id}` : "/views");
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <FirstView />
    </Suspense>
  );
}
