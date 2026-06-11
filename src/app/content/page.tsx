import { getSelfMediaContentWorkbench } from "@/domain/self-media/runtime";
import { ContentPage } from "@/domain/self-media/ui";
import type { ContentPageInitialRequest } from "@/domain/self-media/ui/screens/ContentPage";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function initialRequestFromSearchParams(params: SearchParams): ContentPageInitialRequest {
  const contentId = firstParam(params, "contentId");
  const versionId = firstParam(params, "versionId");
  const dataDomain = firstParam(params, "dataDomain");
  const acceptanceRunId = firstParam(params, "acceptanceRunId") ?? firstParam(params, "acceptance_run_id");
  return {
    acceptanceRunId,
    contentId,
    dataDomain: dataDomain === "acceptance_run" || dataDomain === "user_work" ? dataDomain : undefined,
    mode: contentId || versionId ? "library" : "composer",
    scheduledAt: firstParam(params, "scheduledAt"),
    versionId
  };
}

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const snapshot = await getSelfMediaContentWorkbench();
  const resolvedSearchParams = await searchParams;
  return <ContentPage initialRequest={initialRequestFromSearchParams(resolvedSearchParams ?? {})} snapshot={snapshot} />;
}
