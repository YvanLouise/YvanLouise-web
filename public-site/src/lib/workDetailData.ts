import { LEGACY_API_BASE, LEGACY_BACKEND_MODE, PUBLIC_CONTENT_BASE, STATIC_CONTENT_URL, STATIC_PUBLIC_SITE_MODE } from "@shared/lib/apiEnvironment";
import { ApiError } from "@shared/lib/apiError";
import { workDetailCollection } from "@shared/lib/workDetail";
import { requestJson } from "@shared/lib/requestJson";
import { writeCachedWorks } from "@shared/lib/siteCache";
import type { SiteContentFile, Work } from "@shared/types";

// Detail pages must not resurrect deleted works from sample data or stale caches.
export async function loadWorkDetail(workId: string, signal: AbortSignal): Promise<{ work: Work; works: Work[] }> {
  let works: Work[];
  if (LEGACY_BACKEND_MODE) {
    works = await requestJson<Work[]>(`${LEGACY_API_BASE}/api/works`, { signal, cache: "no-cache" });
  } else {
    const body = STATIC_PUBLIC_SITE_MODE
      ? await requestJson<SiteContentFile>(STATIC_CONTENT_URL, { signal, cache: "no-cache" })
      : (await requestJson<{ content: SiteContentFile }>(`${PUBLIC_CONTENT_BASE}/public-content`, { signal, cache: "no-cache" })).content;
    if (!body || !Array.isArray(body.works)) throw new Error("作品数据格式异常，请稍后重试。");
    works = body.works;
  }
  const { work, works: validWorks } = workDetailCollection(works, workId);
  writeCachedWorks(validWorks);
  if (!work) throw new ApiError("该作品可能已下架，或链接已失效。", 404);
  return { work, works: validWorks };
}
