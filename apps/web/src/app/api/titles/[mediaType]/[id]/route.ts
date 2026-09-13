import { loadTitleDetails } from "@/features/title/loadTitleDetails";
import { serialisePreview, titlePreviewFromDetails } from "@/features/title/titlePreview";
import { isMediaType, parseTmdbId } from "@/features/title/titleRoute";

const jsonHeaders = { "Cache-Control": "private, max-age=60", "Content-Type": "application/json" };

/** Preview data for the browse hover card. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/titles/[mediaType]/[id]">,
) {
  const { mediaType, id } = await params;
  const tmdbId = parseTmdbId(id);

  if (!isMediaType(mediaType) || tmdbId === undefined) {
    return Response.json({ kind: "not-found" }, { status: 404 });
  }

  const result = await loadTitleDetails(mediaType, tmdbId);

  switch (result.kind) {
    case "ok":
      return new Response(serialisePreview(titlePreviewFromDetails(result.details)), {
        headers: jsonHeaders,
      });
    case "not-found":
      return Response.json(result, { status: 404 });
    case "error":
      return Response.json(result, { status: 502 });

    default: {
      const unsupportedResult: never = result;

      return unsupportedResult;
    }
  }
}
