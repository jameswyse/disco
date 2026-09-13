import { Suspense } from "react";

import { parsePageNumber } from "@/features/browse/pageNumber";
import { parseRequestFilter } from "@/features/requests/loadRequests";
import { RequestsPage } from "@/features/requests/RequestsPage";

import Loading from "../loading";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Requests" };

async function Requests({ searchParams }: PageProps<"/requests">) {
  const query = await searchParams;

  return (
    <RequestsPage filter={parseRequestFilter(query.filter)} page={parsePageNumber(query.page)} />
  );
}

export default function Page(properties: PageProps<"/requests">) {
  return (
    <Suspense fallback={<Loading />}>
      <Requests {...properties} />
    </Suspense>
  );
}
