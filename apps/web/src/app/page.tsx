import { redirect } from "next/navigation";
import { connection } from "next/server";

import { loadViews } from "@/features/views/loadViews";

export default async function Page() {
  await connection();
  const [firstView] = await loadViews();

  redirect(firstView ? `/${firstView.id}` : "/views");
}
