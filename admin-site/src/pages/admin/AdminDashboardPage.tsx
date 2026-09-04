import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { lazy, Suspense } from "react";
import { EditableImage } from "../../components/admin/EditableImage";
import { filterAdminWorks, mergeSaved, parseSocialLinksText, parseUiText, parseWorkText, workTextFields } from "../../lib/editorState";
import { resolvePublicSiteUrl } from "../../lib/publicSite";
import { requestJson } from "@shared/lib/requestJson";
import { getSamplePage, mergePagesWithSamples, samplePages, sampleSettings } from "../../data/sampleData";
import { resolveWorkCoverUrl } from "../../lib/workMedia";
import { resolveFeaturedWorks } from "@shared/lib/featuredWorks";
import { normalizeSiteContent, toSiteContentFile } from "@shared/lib/contentSnapshot";
import {
  createAdminWork,
  deleteAdminWork,
  getAdminMessages,
  getAdminPages,
  getAdminReviews,
  getAdminSiteSettings,
  getAdminWorks,
  updateAdminPage,
  updateAdminSiteSettings,
  updateAdminWork,
  uploadAdminAsset
} from "../../lib/api";
import { Message, PageContent, Review, SiteContentFile, SiteContentSnapshot, SiteSettings, SocialLink, Work, WorkType } from "../../types";
const AboutPage = lazy(() => import("../AboutPage").then(m => ({ default: m.AboutPage })));
const CommissionPage = lazy(() => import("../CommissionPage").then(m => ({ default: m.CommissionPage })));
const ContactPage = lazy(() => import("../ContactPage").then(m => ({ default: m.ContactPage })));
const HomePage = lazy(() => import("../HomePage").then(m => ({ default: m.HomePage })));
const SupportPage = lazy(() => import("../SupportPage").then(m => ({ default: m.SupportPage })));
const MobilePreviewWorkbench = lazy(() => import("../../components/admin/MobilePreviewWorkbench").then(m => ({ default: m.MobilePreviewWorkbench })));
const MusicClipLibraryEditor = lazy(() => import("../../components/admin/MusicClipLibraryEditor").then(m => ({ default: m.MusicClipLibraryEditor })));

type TabKey = "overview" | "content" | "works" | "sync" | "messages" | "reviews" | "settings" | "preview";
type EditablePageSlug = "home" | "about" | "commission" | "support" | "contact";
type SettingsImageField = "bannerImageUrl" | "avatarImageUrl";
const STORAGE_KEYS = {
  activeTab: "yl-admin-active-tab",
  pageSlug: "yl-admin-page-slug",
  editingWorkId: "yl-admin-editing-work-id"
} as const;
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "总览" },
  { key: "content", label: "页内编辑" },
  { key: "works", label: "作品管理" },
  { key: "sync", label: "同步检测" },
  { key: "messages", label: "私信" },
  { key: "reviews", label: "评论" },
  { key: "settings", label: "全局设置" },
  { key: "preview", label: "手机预览" }
];

const EDITABLE_PAGES: Array<{ slug: EditablePageSlug; label: string }> = [
  { slug: "home", label: "首页" },
  { slug: "about", label: "关于" },
  { slug: "commission", label: "委托" },
  { slug: "support", label: "支持" },
  { slug: "contact", label: "联系" }
];

const EMPTY_WORK: Partial<Work> = {
  title: "",
  type: "software",
  summary: "",
  detailIntro: "",
  background: "",
  process: "",
  result: "",
  featureList: [],
  interactionPoints: [],
  galleryImages: [],
  detailSections: [],
  platform: "",
  status: "",
  publishedAt: "",
  coverUrl: "",
  demoUrl: "",
  repoUrl: ""
};

function replacePage(list: PageContent[], page: PageContent): PageContent[] {
  const next = list.some((item) => item.slug === page.slug)
    ? list.map((item) => (item.slug === page.slug ? page : item))
    : [...list, page];

  return mergePagesWithSamples(next);
}

function normalizePageSlug(slug: string): EditablePageSlug {
  return EDITABLE_PAGES.some((item) => item.slug === slug) ? (slug as EditablePageSlug) : "home";
}

function serializeSocialLinks(value: SocialLink[]): string {
  return value.map((item) => `${item.label}|${item.url}`).join("\n");
}

function getTypeLabel(type: WorkType): string {
  return type === "music" ? "音乐" : type === "software" ? "软件" : type === "game" ? "游戏" : "动画";
}

const MAX_FEATURED_WORKS = 6;
function resolveOnlineSiteUrl(): string {
  const configured = (import.meta.env.VITE_ONLINE_SITE_URL as string | undefined)?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const publicSiteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
  if (publicSiteUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(publicSiteUrl)) {
    return publicSiteUrl.replace(/\/+$/, "");
  }

  return "https://yvanlouise.xyz";
}

const PUBLIC_SITE_URL = resolveOnlineSiteUrl();

interface SyncAssetIssue {
  path: string;
  reason: string;
}

interface SyncCheckResult {
  checkedAt: string;
  onlineUrl: string;
  contentMatches: boolean;
  localGeneratedAt?: string;
  onlineGeneratedAt?: string;
  localAssetCount: number;
  missingOnlineAssets: SyncAssetIssue[];
}

function normalizeForComparison(snapshot: SiteContentSnapshot): unknown {
  const content = toSiteContentFile(snapshot);

  return {
    works: content.works,
    pages: content.pages,
    siteSettings: content.siteSettings,
    featuredWorkIds: content.featuredWorkIds,
    uiText: content.uiText
  };
}

function createLocalSnapshot(works: Work[], pages: PageContent[], settings: SiteSettings): SiteContentSnapshot {
  return {
    works,
    pages: mergePagesWithSamples(pages),
    siteSettings: settings
  };
}

function collectAssetPaths(snapshot: SiteContentSnapshot): string[] {
  const paths = new Set<string>();
  const add = (value: string | undefined): void => {
    if (!value) {
      return;
    }

    const trimmed = value.trim().replace(/^\/+/, "");
    if (trimmed.startsWith("uploads/")) {
      paths.add(trimmed);
    }
  };

  add(snapshot.siteSettings.bannerImageUrl);
  add(snapshot.siteSettings.avatarImageUrl);
  snapshot.siteSettings.musicPreviewClips.forEach((clip) => add(clip.sourceUrl));
  snapshot.works.forEach((work) => {
    add(work.coverUrl);
    work.galleryImages.forEach(add);
  });

  return Array.from(paths).sort((first, second) => first.localeCompare(second));
}

async function verifyOnlineAsset(baseUrl: string, assetPath: string): Promise<SyncAssetIssue | null> {
  const url = `${baseUrl}/${assetPath}`;

  try {
    const response = await fetch(`${url}?t=${Date.now()}`, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(8000) });
    return response.ok ? null : { path: assetPath, reason: `HTTP ${response.status}` };
  } catch (error) {
    return { path: assetPath, reason: error instanceof Error ? error.message : "无法访问线上资源" };
  }
}

function readSessionValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value) {
      window.sessionStorage.setItem(key, value);
    } else {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures so editing can continue normally.
  }
}

export function AdminDashboardPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const stored = readSessionValue(STORAGE_KEYS.activeTab);
    return TABS.some((tab) => tab.key === stored) ? (stored as TabKey) : "overview";
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [workQuery, setWorkQuery] = useState("");
  const [workType, setWorkType] = useState("all");
  const [workSort, setWorkSort] = useState("default");
  const [workText, setWorkText] = useState(() => workTextFields(EMPTY_WORK));
  const [musicDirty, setMusicDirty] = useState(false);
  const workFormRef = useRef<HTMLFormElement>(null);
  const settingsFormRef = useRef<HTMLFormElement>(null);
  const workEditorRef = useRef<HTMLElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [pages, setPages] = useState<PageContent[]>(mergePagesWithSamples(samplePages));
  const [pageDrafts, setPageDrafts] = useState<PageContent[]>(mergePagesWithSamples(samplePages));
  const [settings, setSettings] = useState<SiteSettings>(sampleSettings);
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings>(sampleSettings);
  const [status, setStatusText] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"info" | "error">("info");
  const [syncChecking, setSyncChecking] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncCheckResult | null>(null);
  const [pageSlug, setPageSlug] = useState<EditablePageSlug>(() => normalizePageSlug(readSessionValue(STORAGE_KEYS.pageSlug) ?? "home"));
  const [workDraft, setWorkDraft] = useState<Partial<Work>>(EMPTY_WORK);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(() => readSessionValue(STORAGE_KEYS.editingWorkId));
  const [socialLinksText, setSocialLinksText] = useState<string>(serializeSocialLinks(sampleSettings.socialLinks));
  const [uiTextJson, setUiTextJson] = useState<string>(JSON.stringify(sampleSettings.uiText, null, 2));
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const latestEditorRef = useRef({ settings, editingWorkId, works });
  latestEditorRef.current = { settings, editingWorkId, works };

  function setStatus(value: string | null, kind: "info" | "error" = "info"): void {
    setStatusText(value);
    setStatusKind(kind);
  }

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setLoadError(null);

      try {
        const [messagesData, reviewsData, worksData, pagesData, settingsData] = await Promise.all([
          getAdminMessages(),
          getAdminReviews(),
          getAdminWorks(),
          getAdminPages(),
          getAdminSiteSettings()
        ]);

        if (cancelled) return;
        const mergedPages = mergePagesWithSamples(pagesData);
        setMessages(messagesData);
        setReviews(reviewsData);
        setWorks(worksData);
        setPages(mergedPages);
        setPageDrafts(mergedPages);
        setSettings(settingsData);
        setSettingsDraft(settingsData);
        setSocialLinksText(serializeSocialLinks(settingsData.socialLinks));
        setUiTextJson(JSON.stringify(settingsData.uiText, null, 2));
        setPageSlug((current) => normalizePageSlug(current));
        if (editingWorkId) {
          const matchedWork = worksData.find((item) => item.id === editingWorkId);
          if (matchedWork) {
            setWorkDraft({ ...matchedWork });
            setWorkText(workTextFields(matchedWork));
          } else {
            setEditingWorkId(null);
            setWorkDraft({ ...EMPTY_WORK });
            setWorkText(workTextFields(EMPTY_WORK));
          }
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "无法读取后台数据。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [loadAttempt]);
  useEffect(() => {
    writeSessionValue(STORAGE_KEYS.activeTab, activeTab);
  }, [activeTab]);
  useEffect(() => {
    writeSessionValue(STORAGE_KEYS.pageSlug, pageSlug);
  }, [pageSlug]);
  useEffect(() => {
    writeSessionValue(STORAGE_KEYS.editingWorkId, editingWorkId);
  }, [editingWorkId]);
  const featuredWorks = useMemo(
    () => settingsDraft.featuredWorkIds.map(id => works.find(work => work.id === id)).filter((work): work is Work => Boolean(work)),
    [works, settingsDraft.featuredWorkIds]
  );
  const previewFeaturedWorks = useMemo(() => resolveFeaturedWorks(works, settingsDraft.featuredWorkIds, MAX_FEATURED_WORKS), [works, settingsDraft.featuredWorkIds]);
  const selectedPage = pageDrafts.find((item) => item.slug === pageSlug) ?? getSamplePage(pageSlug);
  const workCountText = useMemo(() => `${works.length} 个作品`, [works.length]);
  const baselineWork = works.find(work => work.id === editingWorkId) ?? EMPTY_WORK;
  const workDirty = JSON.stringify(workDraft) !== JSON.stringify(baselineWork) || JSON.stringify(workText) !== JSON.stringify(workTextFields(baselineWork));
  const settingsDirty = JSON.stringify(settingsDraft) !== JSON.stringify(settings) || uiTextJson !== JSON.stringify(settings.uiText, null, 2) || socialLinksText !== serializeSocialLinks(settings.socialLinks);
  const dirtyPages = pageDrafts.filter(page => JSON.stringify(page) !== JSON.stringify(pages.find(saved => saved.slug === page.slug)));
  const hasUnsavedChanges = workDirty || settingsDirty || dirtyPages.length > 0 || musicDirty;
  const visibleWorks = useMemo(() => filterAdminWorks(works, workQuery, workType, workSort), [works, workQuery, workType, workSort]);

  useEffect(() => {
    if (!hasUnsavedChanges && !busy && !galleryUploading) return;
    const warn = (event: BeforeUnloadEvent): void => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges, busy, galleryUploading]);

  useEffect(() => {
    const save = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (busyRef.current || loading || loadError || galleryUploading) return;
      if (activeTab === "works") workFormRef.current?.requestSubmit();
      else if (activeTab === "settings") settingsFormRef.current?.requestSubmit();
      else if (activeTab === "content") void saveInteractivePage();
    };
    window.addEventListener("keydown", save);
    return () => window.removeEventListener("keydown", save);
  });

  async function mutate(action: () => Promise<void>): Promise<void> {
    if (busyRef.current || loading || loadError) throw new Error("请等待当前操作完成或重新连接后台。");
    busyRef.current = true;
    setBusy(true);
    setStatus(null);
    try { await action(); setSyncResult(null); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function selectTab(tab: TabKey): void {
    if (busy || galleryUploading) return;
    if (activeTab === "settings" && tab !== "settings" && musicDirty && !window.confirm("音乐片段还有未保存的编辑，离开将丢失该片段草稿。继续吗？")) return;
    if (tab !== "settings") setMusicDirty(false);
    if (tab !== activeTab) setStatus(null);
    setActiveTab(tab);
  }

  function exportContent(): void {
    const file = new Blob([JSON.stringify(toSiteContentFile(createLocalSnapshot(works, pages, settings)), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `site-content-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("已导出已保存的公开内容，不含私信、评论或未保存草稿。");
  }

  function updatePageDraft(slug: EditablePageSlug, patch: Partial<PageContent>): void {
    setPageDrafts((prev) => prev.map((item) => (item.slug === slug ? { ...item, ...patch } : item)));
  }

  function updateSettingsDraft(patch: Partial<SiteSettings>): void {
    setSettingsDraft((prev) => ({ ...prev, ...patch }));
  }

  function updateWorkDraft(patch: Partial<Work>): void {
    setWorkDraft((prev) => ({ ...prev, ...patch }));
  }

  function applySettingsState(nextSettings: SiteSettings): void {
    setSettings(nextSettings);
    setSettingsDraft(nextSettings);
    setSocialLinksText(serializeSocialLinks(nextSettings.socialLinks));
    setUiTextJson(JSON.stringify(nextSettings.uiText, null, 2));
  }

  async function checkPublicSiteSync(): Promise<void> {
    setSyncChecking(true);
    setStatus(null);

    try {
      const onlineUrl = `${PUBLIC_SITE_URL}/site-content.json`;
      const onlineSnapshot = normalizeSiteContent(await requestJson<SiteContentFile>(`${onlineUrl}?t=${Date.now()}`, { cache: "no-store" }));
      const localSnapshot = createLocalSnapshot(works, pages, settings);
      const contentMatches = JSON.stringify(normalizeForComparison(localSnapshot)) === JSON.stringify(normalizeForComparison(onlineSnapshot));
      const localAssetPaths = collectAssetPaths(localSnapshot);
      const assetResults: Array<SyncAssetIssue | null> = [];
      for (let offset = 0; offset < localAssetPaths.length; offset += 4) {
        assetResults.push(...await Promise.all(localAssetPaths.slice(offset, offset + 4).map(assetPath => verifyOnlineAsset(PUBLIC_SITE_URL, assetPath))));
      }
      const missingOnlineAssets = assetResults.filter((item): item is SyncAssetIssue => item !== null);

      setSyncResult({
        checkedAt: new Date().toLocaleString("zh-CN"),
        onlineUrl,
        contentMatches,
        localGeneratedAt: localSnapshot.generatedAt,
        onlineGeneratedAt: onlineSnapshot.generatedAt,
        localAssetCount: localAssetPaths.length,
        missingOnlineAssets
      });

      setStatus(contentMatches && missingOnlineAssets.length === 0 ? "线上网站已与本地公开内容同步。" : "检测完成：线上网站与本地数据存在差异。");
    } catch (error) {
      setSyncResult(null);
      setStatus(error instanceof Error ? error.message : "同步检测失败。", "error");
    } finally {
      setSyncChecking(false);
    }
  }

  async function persistPageDraft(slug: EditablePageSlug): Promise<void> {
    const draft = pageDrafts.find((item) => item.slug === slug) ?? getSamplePage(slug);
    const updated = await updateAdminPage(slug, {
      title: draft.title,
      hero: draft.hero,
      body: draft.body,
      highlights: draft.highlights
    });

    setPages((prev) => replacePage(prev, updated));
    setPageDrafts((prev) => prev.map(page => page.slug === slug ? mergeSaved(page, draft, updated) : page));
  }

  async function persistSettingsDraft(nextSettings: SiteSettings): Promise<void> {
    const updated = await updateAdminSiteSettings(nextSettings);
    applySettingsState(updated);
  }

  async function persistSettingsPatch(patch: Partial<SiteSettings>): Promise<void> {
    const baseline = latestEditorRef.current.settings;
    const updated = await updateAdminSiteSettings({ ...baseline, ...patch });
    setSettings(updated);
    setSettingsDraft(current => ({ ...mergeSaved(current, baseline, updated), ...patch }));
  }

  async function persistFeaturedWorkIds(nextIds: string[], successMessage: string): Promise<void> {
    try {
      await mutate(async () => {
        await persistSettingsPatch({ featuredWorkIds: nextIds });
        setStatus(successMessage);
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "精选作品保存失败，请稍后再试。", "error");
    }
  }

  async function toggleFeaturedWork(work: Work): Promise<void> {
    const currentIds = settingsDraft.featuredWorkIds ?? [];
    const isFeatured = currentIds.includes(work.id);

    if (!isFeatured && currentIds.length >= MAX_FEATURED_WORKS) {
      setStatus(`首页精选最多可设置 ${MAX_FEATURED_WORKS} 个作品。`);
      return;
    }

    const nextIds = isFeatured ? currentIds.filter((id) => id !== work.id) : [...currentIds, work.id];
    await persistFeaturedWorkIds(nextIds, isFeatured ? `已将《${work.title}》移出首页精选。` : `已将《${work.title}》加入首页精选。`);
  }

  async function moveFeaturedWork(workId: string, direction: -1 | 1): Promise<void> {
    const currentIds = [...(settingsDraft.featuredWorkIds ?? [])];
    const index = currentIds.indexOf(workId);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= currentIds.length) {
      return;
    }

    const [item] = currentIds.splice(index, 1);
    currentIds.splice(targetIndex, 0, item);

    await persistFeaturedWorkIds(currentIds, "首页精选顺序已更新。");
  }

  async function saveInteractivePage(): Promise<void> {
    try {
      await mutate(async () => {
        const nextSettings = pageSlug === "home" ? { ...settingsDraft, socialLinks: parseSocialLinksText(socialLinksText, true), uiText: parseUiText(uiTextJson, sampleSettings.uiText) } : null;
        await persistPageDraft(pageSlug);
        if (nextSettings) await persistSettingsDraft(nextSettings);
        setStatus("当前页面已保存到本地；线上状态请在同步检测中确认。");
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败。", "error");
    }
  }

  function resetCurrentDraft(): void {
    if (!window.confirm("放弃当前页面的未保存修改，恢复到最近保存的版本？")) return;
    const savedPage = pages.find((item) => item.slug === pageSlug) ?? getSamplePage(pageSlug);
    setPageDrafts((prev) => replacePage(prev, savedPage));

    if (pageSlug === "home") {
      setSettingsDraft(settings);
      setSocialLinksText(serializeSocialLinks(settings.socialLinks));
      setUiTextJson(JSON.stringify(settings.uiText, null, 2));
    }

    setStatus("当前草稿已恢复到最近一次保存的版本。");
  }

  function startEditWork(work?: Work): void {
    if (busy || galleryUploading) return;
    if (workDirty && !window.confirm("当前作品有未保存修改，切换将丢失这些修改。继续吗？")) return;
    setWorkText(workTextFields(work ?? EMPTY_WORK));
    if (!work) {
      setEditingWorkId(null);
      setWorkDraft({ ...EMPTY_WORK });
      workEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setStatus("已切换到新作品草稿，可以先保存骨架再慢慢补内容。");
      return;
    }

    setEditingWorkId(work.id);
    setWorkDraft({ ...work });
    workEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveWork(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const publishedAt = (workDraft.publishedAt ?? "").trim();
    const payload: Partial<Work> = {
      title: (workDraft.title ?? "").trim() || "未命名作品",
      type: (workDraft.type as WorkType | undefined) ?? "software",
      summary: (workDraft.summary ?? "").trim(),
      detailIntro: (workDraft.detailIntro ?? "").trim(),
      background: (workDraft.background ?? "").trim(),
      process: (workDraft.process ?? "").trim(),
      result: (workDraft.result ?? "").trim(),
      featureList: workDraft.featureList ?? [],
      interactionPoints: workDraft.interactionPoints ?? [],
      galleryImages: workDraft.galleryImages ?? [],
      detailSections: workDraft.detailSections ?? [],
      platform: (workDraft.platform ?? "").trim(),
      status: (workDraft.status ?? "").trim(),
      ...(publishedAt ? { publishedAt } : {}),
      coverUrl: (workDraft.coverUrl ?? "").trim(),
      demoUrl: (workDraft.demoUrl ?? "").trim(),
      repoUrl: (workDraft.repoUrl ?? "").trim()
    };

    try {
      await mutate(async () => {
        Object.assign(payload, parseWorkText(workText));
        const updated = editingWorkId ? await updateAdminWork(editingWorkId, payload) : await createAdminWork(payload);
        setWorks(current => current.some(work => work.id === updated.id) ? current.map(work => work.id === updated.id ? updated : work) : [updated, ...current]);
        setEditingWorkId(updated.id);
        setWorkDraft(updated);
        setWorkText(workTextFields(updated));
        setStatus(editingWorkId ? "作品已更新到本地。" : "新作品已创建。草稿中的素材已一并保存。");
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败。", "error");
    }
  }

  async function removeWork(workId: string): Promise<void> {
    const title = works.find(work => work.id === workId)?.title ?? workId;
    if (!window.confirm(`确定删除《${title}》？此操作不能撤销，上传文件不会被删除。${editingWorkId === workId && workDirty ? "当前作品的未保存草稿也将丢失。" : ""}`)) return;
    try {
      await mutate(async () => {
        await deleteAdminWork(workId);
        setWorks(prev => prev.filter(item => item.id !== workId));
        if (editingWorkId === workId) {
          setEditingWorkId(null);
          setWorkDraft({ ...EMPTY_WORK });
          setWorkText(workTextFields(EMPTY_WORK));
        }
        if (settings.featuredWorkIds.includes(workId)) {
          try { await persistSettingsPatch({ featuredWorkIds: settings.featuredWorkIds.filter(id => id !== workId) }); }
          catch { setStatus("作品已删除，但精选设置更新失败，请重试调整精选列表。", "error"); return; }
        }
        setStatus("作品已删除，并已移出首页精选。原上传文件保留。");
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "删除失败。", "error");
    }
  }

  async function persistMusicPreviewClips(nextClips: SiteSettings["musicPreviewClips"]): Promise<void> {
    await mutate(() => persistSettingsPatch({ musicPreviewClips: nextClips }));
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    try {
      await mutate(async () => {
        const parsedUiText = parseUiText(uiTextJson, sampleSettings.uiText);
        await persistSettingsDraft({ ...settingsDraft, socialLinks: parseSocialLinksText(socialLinksText, true), uiText: parsedUiText });
        setStatus("站点设置已更新到本地。音乐片段需单独保存到片段库。");
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "更新失败，请检查界面文案 JSON 是否有效。", "error");
    }
  }

  async function handleSettingsImageUpload(field: SettingsImageField, url: string): Promise<void> {
    await mutate(async () => {
      await persistSettingsPatch({ [field]: url });
      setStatus(field === "bannerImageUrl" ? "横幅图片已更新。" : "头像图片已更新。");
    });
  }

  async function handleWorkCoverUpload(workId: string, url: string): Promise<void> {
    await mutate(async () => {
      const baseline = latestEditorRef.current.works.find(work => work.id === workId);
      const updated = await updateAdminWork(workId, { coverUrl: url });
      setWorks(prev => prev.map(item => item.id === workId ? updated : item));
      if (latestEditorRef.current.editingWorkId === workId) setWorkDraft(prev => ({ ...mergeSaved(prev, baseline ?? prev, updated), coverUrl: url }));
      setStatus(`作品封面已更新：${updated.title}`);
    });
  }

  async function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    try {
      setGalleryUploading(true);
      if (workText.galleryImages.split("\n").filter(line => line.trim()).length + files.length > 20) throw new Error("每个作品最多 20 张图集图片。");
      for (const file of files) {
        if (!file.type.startsWith("image/")) throw new Error(`请选择图片文件：${file.name}`);
        const uploaded = await uploadAdminAsset(file, `work-gallery-${editingWorkId ?? "draft"}`);
        setWorkText(prev => ({ ...prev, galleryImages: `${prev.galleryImages.trim()}\n${uploaded.url}`.trim() }));
      }
      setStatus(`已将 ${files.length} 张图加入草稿，请保存作品后生效。`);
    } catch (error) {
      setStatus(`${error instanceof Error ? error.message : "图集上传失败。"} 已成功上传的图片保留在草稿中。`, "error");
    } finally {
      setGalleryUploading(false);
      event.target.value = "";
    }
  }

  function renderInteractiveCanvas(): JSX.Element {
    if (pageSlug === "home") {
      return (
        <HomePage
          mode="edit"
          contentOverride={selectedPage}
          settingsOverride={settingsDraft}
          worksOverride={previewFeaturedWorks}
          onContentChange={(patch) => updatePageDraft("home", patch)}
          onSettingsChange={updateSettingsDraft}
          onSettingsImageUpload={handleSettingsImageUpload}
        />
      );
    }

    if (pageSlug === "about") {
      return <AboutPage mode="edit" contentOverride={selectedPage} onContentChange={(patch) => updatePageDraft("about", patch)} />;
    }

    if (pageSlug === "commission") {
      return <CommissionPage mode="edit" contentOverride={selectedPage} onContentChange={(patch) => updatePageDraft("commission", patch)} />;
    }

    if (pageSlug === "support") {
      return <SupportPage mode="edit" contentOverride={selectedPage} onContentChange={(patch) => updatePageDraft("support", patch)} />;
    }

    return <ContactPage mode="edit" contentOverride={selectedPage} onContentChange={(patch) => updatePageDraft("contact", patch)} />;
  }

  return (
    <main className="admin-shell">
      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="后台导航">
          <span className="badge">开发者模式</span>
          <h2 style={{ margin: "0.8rem 0 0" }}>本地管理后台</h2>
          <p className="meta">管理内容、整理作品与验证发布。修改保存在本地，线上状态单独检测。</p>

          <nav className="admin-nav">
            {TABS.map((tab) => (
              <button type="button" key={tab.key} className={activeTab === tab.key ? "active" : ""} aria-current={activeTab === tab.key ? "page" : undefined} disabled={busy || galleryUploading} onClick={() => selectTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="stack" style={{ marginTop: "1rem" }}>
            <span className="meta">仅本机访问 · 无需账号密码</span>
          </div>
        </aside>

        <section className="admin-panel">
          <div className="admin-toolbar">
            <div><p className="meta" style={{ margin: "0 0 0.35rem" }}>开发者工作台</p><h1 style={{ margin: 0 }}>{TABS.find(tab => tab.key === activeTab)?.label}</h1></div>
            <span className={`badge ${hasUnsavedChanges ? "draft-badge" : ""}`} role="status">{loading ? "连接后台中…" : loadError ? "连接失败" : busy || galleryUploading ? "正在处理…" : hasUnsavedChanges ? "有未保存修改" : "本地内容已载入"}</span>
          </div>

          {status ? <p className={`notice admin-notice ${statusKind === "error" ? "error" : ""}`} role={statusKind === "error" ? "alert" : "status"}>{status}<button className="mini-btn" type="button" onClick={() => setStatus(null)} aria-label="关闭提示">×</button></p> : null}
          {loading ? <p className="notice" role="status">正在读取真实后台数据，请稍候…</p> : null}
          {loadError ? <section className="panel stack" role="alert"><h3>无法连接本地后台</h3><p>{loadError}</p><p className="meta">请运行 start-admin-site.bat。数据未载入前已暂停编辑，避免将示例内容覆盖到真实网站。</p><button type="button" className="btn btn-primary" onClick={() => setLoadAttempt(value => value + 1)}>重新连接</button></section> : null}
          {!loading && !loadError && hasUnsavedChanges ? <div className="admin-draft-summary" role="status">未保存：{[workDirty ? "作品草稿" : "", dirtyPages.length ? `${dirtyPages.length} 个页面` : "", settingsDirty ? "全局设置" : "", musicDirty ? "音乐片段" : ""].filter(Boolean).join("、")}。切换栏目会保留页面、作品与设置草稿；Ctrl / ⌘ + S 保存当前编辑区。</div> : null}
          <fieldset className="admin-content-fieldset" disabled={busy || galleryUploading} hidden={loading || Boolean(loadError)} aria-busy={busy || galleryUploading}>
          <Suspense fallback={<p className="notice" role="status">正在加载编辑器…</p>}>

          {activeTab === "overview" ? (
            <section className="admin-grid">
              <article className="panel stack admin-quick-actions">
                <h3 style={{ margin: 0 }}>开始工作</h3>
                <p className="meta">保存内容后，可打开公开站检查效果；导出备份仅包含已保存的公开内容。</p>
                <div className="row"><button type="button" className="btn btn-primary" onClick={() => selectTab("works")}>管理作品</button><button type="button" className="btn btn-secondary" onClick={() => selectTab("content")}>编辑页面</button><button type="button" className="btn btn-secondary" onClick={exportContent}>导出内容备份</button><a className="btn btn-secondary" href={resolvePublicSiteUrl()} target="_blank" rel="noreferrer">打开本地公开站</a></div>
                <p className="meta">公开站未启动时，请运行 start-public-site.bat；保存成功不代表线上部署完成。</p>
              </article>
              <article className="panel stack">
                <h3 style={{ margin: 0 }}>作品总数</h3>
                <strong style={{ fontSize: "2rem" }}>{works.length}</strong>
                <p className="meta" style={{ margin: 0 }}>{workCountText}</p>
              </article>
              <article className="panel stack">
                <h3 style={{ margin: 0 }}>首页精选</h3>
                <strong style={{ fontSize: "2rem" }}>{featuredWorks.length}</strong>
                <p className="meta" style={{ margin: 0 }}>当前最多可设置 {MAX_FEATURED_WORKS} 个精选作品。</p>
              </article>
              <article className="panel stack">
                <h3 style={{ margin: 0 }}>待处理私信</h3>
                <strong style={{ fontSize: "2rem" }}>{messages.filter((item) => item.status === "new").length}</strong>
                <p className="meta" style={{ margin: 0 }}>访客消息只在后台可见。</p>
              </article>
              <article className="panel stack">
                <h3 style={{ margin: 0 }}>评论反馈</h3>
                <strong style={{ fontSize: "2rem" }}>{reviews.length}</strong>
                <p className="meta" style={{ margin: 0 }}>评分和评论只会显示给你。</p>
              </article>
            </section>
          ) : null}

          {activeTab === "content" ? (
            <section className="stack">
              <div className="studio-toolbar panel">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="page-selector" style={{ minWidth: "220px" }}>
                    当前编辑页面
                    <select id="page-selector" value={pageSlug} onChange={(event) => setPageSlug(normalizePageSlug(event.target.value))}>
                      {EDITABLE_PAGES.map((page) => (
                        <option key={page.slug} value={page.slug}>{page.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="row">
                    <button type="button" className="btn btn-primary" onClick={() => void saveInteractivePage()}>保存当前页面</button>
                    <button type="button" className="btn btn-secondary" onClick={resetCurrentDraft}>放弃当前页修改</button>
                  </div>
                </div>

                <p className="meta" style={{ margin: 0 }}>文字修改后需保存；图片可点击“替换图片”或右键更换，图片单独保存，不覆盖文字草稿。</p>
              </div>

              <div className="studio-shell">{renderInteractiveCanvas()}</div>
            </section>
          ) : null}

          {activeTab === "works" ? (
            <section className="admin-grid works-admin-grid">
              <article className="panel stack">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>作品列表</h3>
                  <button className="btn btn-secondary" type="button" onClick={() => startEditWork(undefined)}>新建作品</button>
                </div>
                <p className="meta" style={{ margin: 0 }}>封面可直接替换；图集加入编辑器草稿后，点击保存作品统一提交。</p>
                <div className="admin-work-filters">
                  <label>搜索作品<input type="search" value={workQuery} onChange={event => setWorkQuery(event.target.value)} placeholder="标题、摘要、平台或状态" /></label>
                  <label>筛选分类<select value={workType} onChange={event => setWorkType(event.target.value)}><option value="all">全部分类</option><option value="music">音乐</option><option value="software">软件</option><option value="game">游戏</option><option value="animation">动画</option></select></label>
                  <label>排序<select value={workSort} onChange={event => setWorkSort(event.target.value)}><option value="default">默认顺序</option><option value="date">最新发布</option><option value="title">标题</option></select></label>
                </div>
                <p className="meta" role="status">显示 {visibleWorks.length} / {works.length} 个作品</p>
                <div className="panel stack" style={{ gap: "0.8rem" }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                    <strong>首页精选作品</strong>
                    <span className="meta">最多 {MAX_FEATURED_WORKS} 个，首页和首页预览会按这里的顺序展示。</span>
                  </div>

                  {featuredWorks.length ? (
                    <div className="stack" style={{ gap: "0.75rem" }}>
                      {featuredWorks.map((work, index) => (
                        <div key={work.id} className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                          <span>
                            #{index + 1} {work.title}
                          </span>
                          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
                            <button type="button" className="btn btn-secondary" onClick={() => void moveFeaturedWork(work.id, -1)} disabled={index === 0}>
                              上移
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => void moveFeaturedWork(work.id, 1)}
                              disabled={index === featuredWorks.length - 1}
                            >
                              下移
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => void toggleFeaturedWork(work)}>
                              取消精选
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="meta" style={{ margin: 0 }}>还没有指定首页精选作品。未指定时，首页会回退显示前 3 个作品。</p>
                  )}
                </div>
                <div className="stack">
                  {!visibleWorks.length ? <div className="admin-empty"><h4>{works.length ? "没有匹配的作品" : "还没有作品"}</h4><p>{works.length ? "试试其他关键词或分类。" : "点击新建作品，开始整理你的第一个项目。"}</p>{works.length ? <button type="button" className="btn btn-secondary" onClick={() => { setWorkQuery(""); setWorkType("all"); }}>清除筛选</button> : null}</div> : null}
                  {visibleWorks.map((work) => (
                    <article key={work.id} className={`panel work-admin-item ${editingWorkId === work.id ? "is-editing" : ""}`}>
                      <div className="admin-work-row">
                        <div className="admin-cover-editor">
                        <EditableImage enabled label={`${work.title} 封面图`} slot={`work-cover-${work.id}`} onUploaded={(url) => handleWorkCoverUpload(work.id, url)}>
                          {(bindProps, state) => (
                            <div className="admin-work-thumb" onContextMenu={bindProps.onContextMenu} title={bindProps.title}>
                              {work.coverUrl ? <img className="admin-work-thumb-image" src={resolveWorkCoverUrl(work.coverUrl)} alt={`${work.title} 封面图`} loading="lazy" decoding="async" /> : <div className="admin-work-placeholder" role="img" aria-label={`${work.title} 暂无封面`}>暂无封面</div>}
                              <span className="admin-work-thumb-badge">{state.isUploading ? "上传中..." : "右键换封面"}</span>
                            </div>
                          )}
                        </EditableImage>
                        </div>

                        <div className="admin-work-meta stack">
                          <div>
                            <strong>{work.title}</strong>
                            <p className="meta" style={{ margin: 0 }}>
                              {getTypeLabel(work.type)} · 发布于 {work.publishedAt}
                            </p>
                          </div>
                          <p className="meta" style={{ margin: 0 }}>{work.summary}</p>
                          <div className="work-list-meta">
                            {settingsDraft.featuredWorkIds.includes(work.id) ? <span>首页精选 #{settingsDraft.featuredWorkIds.indexOf(work.id) + 1}</span> : null}
                            {work.platform ? <span>{work.platform}</span> : null}
                            {work.status ? <span>{work.status}</span> : null}
                            <span>{work.galleryImages.length} 张图集</span>
                          </div>
                          <div className="row">
                            <button type="button" className="btn btn-secondary" onClick={() => startEditWork(work)}>{editingWorkId === work.id ? "重新载入" : "编辑"}</button>
                            <button type="button" className="btn btn-secondary" onClick={() => void toggleFeaturedWork(work)}>{settingsDraft.featuredWorkIds.includes(work.id) ? "取消精选" : "设为精选"}</button>
                            <button type="button" className="btn btn-secondary" onClick={() => void removeWork(work.id)}>删除</button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <article className="panel stack admin-work-editor" ref={workEditorRef}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>{editingWorkId ? "编辑作品" : "创建作品"}</h3>
                  <button type="button" className="btn btn-secondary" onClick={() => galleryInputRef.current?.click()} disabled={galleryUploading}>
                    {galleryUploading ? "上传中..." : "上传图集图片"}
                  </button>
                </div>

                <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => void handleGalleryUpload(event)} />

                <form ref={workFormRef} id="admin-work-form" key={editingWorkId ?? "new-work"} className="form-grid" onSubmit={(event) => void saveWork(event)}>
                  <label>
                    标题
                    <input maxLength={140} value={workDraft.title ?? ""} onChange={(event) => updateWorkDraft({ title: event.target.value })} placeholder="可留空，将自动命名为未命名作品" />
                  </label>
                  <label>
                    分类
                    <select value={(workDraft.type as WorkType | undefined) ?? "software"} onChange={(event) => updateWorkDraft({ type: event.target.value as WorkType })}>
                      <option value="music">音乐</option>
                      <option value="software">软件</option>
                      <option value="game">游戏</option>
                      <option value="animation">动画</option>
                    </select>
                  </label>
                  <label>
                    摘要
                    <textarea maxLength={300} value={workDraft.summary ?? ""} onChange={(event) => updateWorkDraft({ summary: event.target.value })} />
                  </label>
                  <label>
                    详情导语
                    <textarea value={workDraft.detailIntro ?? ""} onChange={(event) => updateWorkDraft({ detailIntro: event.target.value })} rows={4} />
                  </label>
                  <label>
                    项目背景
                    <textarea value={workDraft.background ?? ""} onChange={(event) => updateWorkDraft({ background: event.target.value })} rows={5} />
                  </label>
                  <label>
                    制作过程
                    <textarea value={workDraft.process ?? ""} onChange={(event) => updateWorkDraft({ process: event.target.value })} rows={5} />
                  </label>
                  <label>
                    最终成果
                    <textarea value={workDraft.result ?? ""} onChange={(event) => updateWorkDraft({ result: event.target.value })} rows={5} />
                  </label>
                  <label>
                    平台
                    <input value={workDraft.platform ?? ""} onChange={(event) => updateWorkDraft({ platform: event.target.value })} placeholder="例如 Web / PC / 手机" />
                  </label>
                  <label>
                    状态
                    <input value={workDraft.status ?? ""} onChange={(event) => updateWorkDraft({ status: event.target.value })} placeholder="例如 已发布 / 持续迭代中" />
                  </label>
                  <label>
                    发布时间
                    <input type="date" value={workDraft.publishedAt ?? ""} onChange={(event) => updateWorkDraft({ publishedAt: event.target.value })} />
                  </label>
                  <label>
                    封面图地址
                    <input value={workDraft.coverUrl ?? ""} onChange={(event) => updateWorkDraft({ coverUrl: event.target.value })} placeholder="可留空，前台会显示默认封面" />
                  </label>
                  <label>
                    演示链接
                    <input value={workDraft.demoUrl ?? ""} onChange={(event) => updateWorkDraft({ demoUrl: event.target.value })} />
                  </label>
                  <label>
                    仓库链接
                    <input value={workDraft.repoUrl ?? ""} onChange={(event) => updateWorkDraft({ repoUrl: event.target.value })} />
                  </label>
                  <label>
                    功能亮点（每行一条）
                    <textarea value={workText.featureList} onChange={event => setWorkText(prev => ({ ...prev, featureList: event.target.value }))} rows={5} />
                  </label>
                  <label>
                    交互亮点（每行一条）
                    <textarea value={workText.interactionPoints} onChange={event => setWorkText(prev => ({ ...prev, interactionPoints: event.target.value }))} rows={5} />
                  </label>
                  <label>
                    图集图片地址（每行一条，可先上传再自动写入）
                    <textarea value={workText.galleryImages} onChange={event => setWorkText(prev => ({ ...prev, galleryImages: event.target.value }))} rows={6} />
                  </label>
                  <label>
                    详情补充区块
                    <textarea
                      value={workText.detailSections}
                      onChange={event => setWorkText(prev => ({ ...prev, detailSections: event.target.value }))}
                      rows={8}
                      placeholder={"每个区块格式：第一行写标题，下面写正文；区块与区块之间空一行。"}
                    />
                  </label>
                  <div className="admin-save-bar"><span className="meta">{workDirty ? "作品有未保存修改" : "作品草稿未更改"}</span><button type="submit" className="btn btn-primary">{busy ? "保存中…" : editingWorkId ? "保存修改" : "创建作品"}</button></div>
                </form>
              </article>
            </section>
          ) : null}

          {activeTab === "sync" ? (
            <section className="stack">
              <section className="panel stack">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>线上同步检测</h3>
                    <p className="meta" style={{ margin: "0.35rem 0 0" }}>检测地址：{PUBLIC_SITE_URL}</p>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => void checkPublicSiteSync()} disabled={syncChecking}>
                    {syncChecking ? "检测中..." : "开始检测"}
                  </button>
                </div>
                <p className="meta" style={{ margin: 0 }}>检测只读取线上网站，不会修改本地内容、线上内容或资源文件。</p>
              </section>

              {syncResult ? (
                <section className="admin-grid">
                  <article className="panel stack">
                    <h3 style={{ margin: 0 }}>内容快照</h3>
                    <strong style={{ fontSize: "1.4rem" }}>{syncResult.contentMatches ? "一致" : "不一致"}</strong>
                    <p className="meta" style={{ margin: 0 }}>检测时间：{syncResult.checkedAt}</p>
                  </article>
                  <article className="panel stack">
                    <h3 style={{ margin: 0 }}>公开资源</h3>
                    <strong style={{ fontSize: "1.4rem" }}>{syncResult.missingOnlineAssets.length ? `${syncResult.missingOnlineAssets.length} 个异常` : "可访问"}</strong>
                    <p className="meta" style={{ margin: 0 }}>本地引用资源：{syncResult.localAssetCount} 个</p>
                  </article>
                  <article className="panel stack">
                    <h3 style={{ margin: 0 }}>线上内容地址</h3>
                    <a href={syncResult.onlineUrl} target="_blank" rel="noreferrer">{syncResult.onlineUrl}</a>
                    <p className="meta" style={{ margin: 0 }}>线上生成时间：{syncResult.onlineGeneratedAt ?? "未提供"}</p>
                  </article>
                </section>
              ) : null}

              {syncResult && !syncResult.contentMatches ? (
                <section className="panel stack">
                  <h3 style={{ margin: 0 }}>内容未同步</h3>
                  <p className="meta" style={{ margin: 0 }}>本地已保存内容和线上 `site-content.json` 不一致。通常需要把本地改动推到 GitHub，并等待 GitHub Pages 部署完成。</p>
                </section>
              ) : null}

              {syncResult?.missingOnlineAssets.length ? (
                <section className="panel stack">
                  <h3 style={{ margin: 0 }}>线上资源异常</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>资源路径</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncResult.missingOnlineAssets.map((asset) => (
                        <tr key={asset.path}>
                          <td>{asset.path}</td>
                          <td>{asset.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ) : null}
            </section>
          ) : null}

          {activeTab === "messages" ? (
            <section className="panel stack">
              <h3 style={{ margin: 0 }}>私信列表</h3>
              {!messages.length ? <p className="admin-empty">暂无私信。这里只显示后台实际收到的消息。</p> : null}
              <table className="table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>称呼</th>
                    <th>联系方式</th>
                    <th>主题</th>
                    <th>内容</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => (
                    <tr key={message.id}>
                      <td>{new Date(message.createdAt).toLocaleString("zh-CN")}</td>
                      <td>{message.name}</td>
                      <td>{message.contact}</td>
                      <td>{message.subject}</td>
                      <td>{message.body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {activeTab === "reviews" ? (
            <section className="panel stack">
              <h3 style={{ margin: 0 }}>评分与评论</h3>
              {!reviews.length ? <p className="admin-empty">暂无评论，收到反馈后会显示在这里。</p> : null}
              <table className="table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>作品 ID</th>
                    <th>评分</th>
                    <th>访客</th>
                    <th>评论</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review) => (
                    <tr key={review.id}>
                      <td>{new Date(review.createdAt).toLocaleString("zh-CN")}</td>
                      <td>{works.find(work => work.id === review.workId)?.title ?? `已删除作品 (${review.workId})`}</td>
                      <td>{review.rating}</td>
                      <td>{review.visitorName ?? "匿名"}</td>
                      <td>{review.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {activeTab === "settings" ? (
            <section className="stack">
              <section className="panel stack">
                <h3 style={{ margin: 0 }}>站点设置</h3>
                <p className="meta" style={{ margin: 0 }}>这里可以集中维护横幅文案、站点标题、按钮和社交链接。</p>
                <form ref={settingsFormRef} className="form-grid" onSubmit={(event) => void saveSettings(event)}>
                  <label>
                    站点标题
                    <input value={settingsDraft.siteTitle} onChange={(event) => updateSettingsDraft({ siteTitle: event.target.value })} required />
                  </label>
                  <label>
                    标签
                    <input value={settingsDraft.tagline} onChange={(event) => updateSettingsDraft({ tagline: event.target.value })} required />
                  </label>
                  <label>
                    横幅标签
                    <input value={settingsDraft.bannerBadge} onChange={(event) => updateSettingsDraft({ bannerBadge: event.target.value })} required />
                  </label>
                  <label>
                    横幅标题
                    <textarea value={settingsDraft.bannerHeadline} onChange={(event) => updateSettingsDraft({ bannerHeadline: event.target.value })} rows={3} required />
                  </label>
                  <label>
                    横幅说明
                    <textarea value={settingsDraft.bannerDescription} onChange={(event) => updateSettingsDraft({ bannerDescription: event.target.value })} rows={3} required />
                  </label>
                  <label>
                    主按钮文案
                    <input value={settingsDraft.primaryCtaLabel} onChange={(event) => updateSettingsDraft({ primaryCtaLabel: event.target.value })} required />
                  </label>
                  <label>
                    主按钮链接
                    <input value={settingsDraft.primaryCtaHref} onChange={(event) => updateSettingsDraft({ primaryCtaHref: event.target.value })} required />
                  </label>
                  <label>
                    次按钮文案
                    <input value={settingsDraft.secondaryCtaLabel} onChange={(event) => updateSettingsDraft({ secondaryCtaLabel: event.target.value })} required />
                  </label>
                  <label>
                    次按钮链接
                    <input value={settingsDraft.secondaryCtaHref} onChange={(event) => updateSettingsDraft({ secondaryCtaHref: event.target.value })} required />
                  </label>
                  <label>
                    社交链接（每行 `名称|URL`）
                    <textarea
                      value={socialLinksText}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSocialLinksText(value);
                        updateSettingsDraft({ socialLinks: parseSocialLinksText(value) });
                      }}
                    />
                  </label>
                  <label>
                    爱发电地址
                    <input
                      value={settingsDraft.afdianUrl}
                      onChange={(event) => updateSettingsDraft({ afdianUrl: event.target.value })}
                      placeholder="https://afdian.com/a/你的地址"
                    />
                  </label>
                  <label>
                    全站界面文案 JSON
                    <textarea
                      value={uiTextJson}
                      onChange={(event) => setUiTextJson(event.target.value)}
                      rows={18}
                      spellCheck={false}
                    />
                  </label>
                  <div className="admin-save-bar"><span className="meta">{settingsDirty ? "设置有未保存修改" : "设置未更改"}</span><button type="submit" className="btn btn-primary">{busy ? "保存中…" : "保存站点设置"}</button></div>
                </form>
              </section>

              <MusicClipLibraryEditor
                savedClips={settings.musicPreviewClips}
                draftClips={settingsDraft.musicPreviewClips}
                onPersistClips={persistMusicPreviewClips}
                onDirtyChange={setMusicDirty}
              />
            </section>
          ) : null}

          {activeTab === "preview" ? <MobilePreviewWorkbench /> : null}
          </Suspense>
          </fieldset>
        </section>
      </div>
    </main>
  );
}



















