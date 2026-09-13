import { parsePageNumber } from "@/features/browse/pageNumber";
import { parseRequestFilter } from "@/features/requests/loadRequests";
import { RequestsPage } from "@/features/requests/RequestsPage";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Requests" };

export default async function Page({ searchParams }: PageProps<"/requests">) {
  const query = await searchParams;

  return (
    <RequestsPage filter={parseRequestFilter(query.filter)} page={parsePageNumber(query.page)} />
  );
}
