import { redirect } from "next/navigation";

import { defaultViewId } from "@/features/views/views";

export default function Page() {
  redirect(`/${defaultViewId}`);
}
