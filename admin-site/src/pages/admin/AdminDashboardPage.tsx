import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EditableImage } from "../../components/admin/EditableImage";
import { MobilePreviewWorkbench } from "../../components/admin/MobilePreviewWorkbench";
import { MusicClipLibraryEditor } from "../../components/admin/MusicClipLibraryEditor";
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
import { Message, PageContent, Review, SiteContentFile, SiteContentSnapshot, SiteSettings, SocialLink, Work, WorkDetailSection, WorkType } from "../../types";
import { AboutPage } from "../AboutPage";
import { CommissionPage } from "../CommissionPage";
import { ContactPage } from "../ContactPage";
import { HomePage } from "../HomePage";
import { SupportPage } from "../SupportPage";
import { useAuth } from "../../context/AuthContext";

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

function parseSocialLinks(value: string): SocialLink[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|");
      return { label: (label ?? "").trim(), url: (url ?? "").trim() };
    })
    .filter((item) => item.label && item.url);
}

function serializeLineList(values: string[] | undefined): string {
  return (values ?? []).join("\n");
}

function parseLineList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeDetailSections(sections: WorkDetailSection[] | undefined): string {
  return (sections ?? [])
    .map((section) => `${section.title}\n${section.body}`)
    .join("\n\n");
}

function parseDetailSections(value: string): WorkDetailSection[] {
  return value
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [title, ...bodyLines] = block.split("\n");
      return {
        title: (title ?? "").trim(),
        body: bodyLines.join("\n").trim()
      };
    })
    .filter((item) => item.title && item.body);
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
    const response = await fetch(`${url}?t=${Date.now()}`, { method: "HEAD", cache: "no-store" });
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
  const { username, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const stored = readSessionValue(STORAGE_KEYS.activeTab);
    return TABS.some((tab) => tab.key === stored) ? (stored as TabKey) : "overview";
  });
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [pages, setPages] = useState<PageContent[]>(mergePagesWithSamples(samplePages));
  const [pageDrafts, setPageDrafts] = useState<PageContent[]>(mergePagesWithSamples(samplePages));
  const [settings, setSettings] = useState<SiteSettings>(sampleSettings);
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings>(sampleSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [syncChecking, setSyncChecking] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncCheckResult | null>(null);
  const [pageSlug, setPageSlug] = useState<EditablePageSlug>(() => normalizePageSlug(readSessionValue(STORAGE_KEYS.pageSlug) ?? "home"));
  const [workDraft, setWorkDraft] = useState<Partial<Work>>(EMPTY_WORK);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(() => readSessionValue(STORAGE_KEYS.editingWorkId));
  const [socialLinksText, setSocialLinksText] = useState<string>(serializeSocialLinks(sampleSettings.socialLinks));
  const [uiTextJson, setUiTextJson] = useState<string>(JSON.stringify(sampleSettings.uiText, null, 2));
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);

      try {
        const [messagesData, reviewsData, worksData, pagesData, settingsData] = await Promise.all([
          getAdminMessages(),
          getAdminReviews(),
          getAdminWorks(),
          getAdminPages(),
          getAdminSiteSettings()
        ]);

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
          } else {
            setEditingWorkId(null);
            setWorkDraft({ ...EMPTY_WORK });
          }
        }
        if (editingWorkId) {
          const matchedWork = worksData.find((item) => item.id === editingWorkId);
          if (matchedWork) {
            setWorkDraft({ ...matchedWork });
          } else {
            setEditingWorkId(null);
            setWorkDraft({ ...EMPTY_WORK });
          }
        }
      } catch {
        setStatus("当前使用的是演示数据，但编辑和预览仍然可用。");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);
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
    () => resolveFeaturedWorks(works, settingsDraft.featuredWorkIds, MAX_FEATURED_WORKS),
    [works, settingsDraft.featuredWorkIds]
  );
  const selectedPage = pageDrafts.find((item) => item.slug === pageSlug) ?? getSamplePage(pageSlug);
  const workCountText = useMemo(() => `${works.length} 个作品`, [works.length]);

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

  async function refreshSettingsState(): Promise<SiteSettings> {
    const latest = await getAdminSiteSettings();
    applySettingsState(latest);
    return latest;
  }

  async function refreshWorksState(preferredWorkId?: string | null): Promise<Work[]> {
    const latest = await getAdminWorks();
    setWorks(latest);

    const targetWorkId = preferredWorkId ?? editingWorkId;
    if (targetWorkId) {
      const matched = latest.find((item) => item.id === targetWorkId);
      if (matched) {
        setEditingWorkId(matched.id);
        setWorkDraft(matched);
      } else {
        setEditingWorkId(null);
        setWorkDraft({ ...EMPTY_WORK });
      }
    }

    return latest;
  }

  async function checkPublicSiteSync(): Promise<void> {
    setSyncChecking(true);
    setStatus(null);

    try {
      const onlineUrl = `${PUBLIC_SITE_URL}/site-content.json`;
      const response = await fetch(`${onlineUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`线上内容读取失败：HTTP ${response.status}`);
      }

      const onlineSnapshot = normalizeSiteContent((await response.json()) as SiteContentFile);
      const localSnapshot = createLocalSnapshot(works, pages, settings);
      const contentMatches = JSON.stringify(normalizeForComparison(localSnapshot)) === JSON.stringify(normalizeForComparison(onlineSnapshot));
      const localAssetPaths = collectAssetPaths(localSnapshot);
      const assetResults = await Promise.all(localAssetPaths.map((assetPath) => verifyOnlineAsset(PUBLIC_SITE_URL, assetPath)));
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
      setStatus(error instanceof Error ? error.message : "同步检测失败。");
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
    setPageDrafts((prev) => replacePage(prev, updated));
  }

  async function persistSettingsDraft(nextSettings: SiteSettings): Promise<void> {
    const updated = await updateAdminSiteSettings(nextSettings);
    applySettingsState(updated);
  }

  async function persistFeaturedWorkIds(nextIds: string[], successMessage: string): Promise<void> {
    const nextSettings: SiteSettings = {
      ...settingsDraft,
      featuredWorkIds: nextIds
    };

    setSettingsDraft(nextSettings);

    try {
      const updated = await updateAdminSiteSettings(nextSettings);
      applySettingsState(updated);
      setStatus(successMessage);
    } catch (error) {
      void refreshSettingsState().catch(() => undefined);
      setStatus(error instanceof Error ? error.message : "精选作品保存失败，请稍后再试。");
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
      await persistPageDraft(pageSlug);

      if (pageSlug === "home") {
        await persistSettingsDraft(settingsDraft);
      }

      setStatus("当前页面已保存。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败。");
    }
  }

  function resetCurrentDraft(): void {
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
    if (!work) {
      setEditingWorkId(null);
      setWorkDraft({ ...EMPTY_WORK });
      setStatus("已切换到新作品草稿，可以先保存骨架再慢慢补内容。");
      return;
    }

    setEditingWorkId(work.id);
    setWorkDraft({ ...work });
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
      platform: (workDraft.platform ?? "").trim() || undefined,
      status: (workDraft.status ?? "").trim() || undefined,
      ...(publishedAt ? { publishedAt } : {}),
      coverUrl: (workDraft.coverUrl ?? "").trim(),
      demoUrl: (workDraft.demoUrl ?? "").trim() || undefined,
      repoUrl: (workDraft.repoUrl ?? "").trim() || undefined
    };

    try {
      if (editingWorkId) {
        const updated = await updateAdminWork(editingWorkId, payload);
        await refreshWorksState(updated.id);
        setStatus("作品已更新。");
      } else {
        const created = await createAdminWork(payload);
        await refreshWorksState(created.id);
        setStatus("新作品已创建。");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败。");
    }
  }

  async function removeWork(workId: string): Promise<void> {
    try {
      await deleteAdminWork(workId);

      const previousFeaturedIds = settingsDraft.featuredWorkIds ?? [];
      const nextFeaturedIds = previousFeaturedIds.filter((id) => id !== workId);
      if (nextFeaturedIds.length !== previousFeaturedIds.length) {
        const updatedSettings = await updateAdminSiteSettings({
          ...settingsDraft,
          featuredWorkIds: nextFeaturedIds
        });
        applySettingsState(updatedSettings);
      }

      await refreshWorksState(editingWorkId === workId ? null : editingWorkId);
      setWorks((prev) => prev.filter((item) => item.id !== workId));

      if (editingWorkId === workId) {
        setEditingWorkId(null);
        setWorkDraft({ ...EMPTY_WORK });
      }

      setStatus(nextFeaturedIds.length !== previousFeaturedIds.length ? "作品已删除，并已同步移出首页精选。" : "作品已删除。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "删除失败。");
    }
  }

  async function persistMusicPreviewClips(nextClips: SiteSettings["musicPreviewClips"]): Promise<void> {
    const updated = await updateAdminSiteSettings({
      ...settingsDraft,
      musicPreviewClips: nextClips
    });
    applySettingsState(updated);
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    try {
      const parsedUiText = JSON.parse(uiTextJson) as SiteSettings["uiText"];
      await persistSettingsDraft({ ...settingsDraft, uiText: parsedUiText });
      setStatus("站点设置已更新。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "更新失败，请检查界面文案 JSON 是否有效。");
    }
  }

  async function handleSettingsImageUpload(field: SettingsImageField, url: string): Promise<void> {
    const nextSettings = { ...settingsDraft, [field]: url };
    setSettingsDraft(nextSettings);

    try {
      await persistSettingsDraft(nextSettings);
      await refreshSettingsState();
      setStatus(field === "bannerImageUrl" ? "横幅图片已更新。" : "头像图片已更新。");
    } catch (error) {
      void refreshSettingsState().catch(() => undefined);
      setStatus(error instanceof Error ? error.message : "图片更新失败，请稍后再试。");
    }
  }

  async function handleWorkCoverUpload(workId: string, url: string): Promise<void> {
    setWorks((prev) => prev.map((item) => (item.id === workId ? { ...item, coverUrl: url } : item)));
    if (editingWorkId === workId) {
      setWorkDraft((prev) => ({ ...prev, coverUrl: url }));
    }

    try {
      const updated = await updateAdminWork(workId, { coverUrl: url });
      await refreshWorksState(updated.id);
      setStatus(`作品封面已更新：${updated.title}`);
    } catch (error) {
      void refreshWorksState(workId).catch(() => undefined);
      setStatus(error instanceof Error ? error.message : "作品封面更新失败，请稍后再试。");
    }
  }

  async function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    try {
      setGalleryUploading(true);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const uploaded = await uploadAdminAsset(file, `work-gallery-${editingWorkId ?? "draft"}`);
        uploadedUrls.push(uploaded.url);
      }

      const nextGalleryImages = [...(workDraft.galleryImages ?? []), ...uploadedUrls];
      setWorkDraft((prev) => ({
        ...prev,
        galleryImages: nextGalleryImages
      }));

      if (editingWorkId) {
        const updated = await updateAdminWork(editingWorkId, { galleryImages: nextGalleryImages });
        await refreshWorksState(updated.id);
        setStatus(`已上传并保存 ${uploadedUrls.length} 张图到《${updated.title}》图集。`);
      } else {
        setStatus(`已加入 ${uploadedUrls.length} 张图到当前草稿图集，创建新作品时还需要再点一次保存。`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "图集上传失败。");
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
          worksOverride={featuredWorks}
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
          <h2 style={{ margin: "0.8rem 0 0" }}>你好，{username ?? "管理员"}</h2>
          <p className="meta">现在首页横幅文案可直接改，作品支持长文案、图集、交互亮点与首页精选设置。</p>

          <nav className="admin-nav">
            {TABS.map((tab) => (
              <button type="button" key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="stack" style={{ marginTop: "1rem" }}>
            <button className="btn btn-primary" type="button" onClick={() => void logout()}>退出后台</button>
          </div>
        </aside>

        <section className="admin-panel">
          <div className="admin-toolbar">
            <h1 style={{ margin: 0 }}>网站管理</h1>
            <span className="meta">{loading ? "加载中..." : "已同步"}</span>
          </div>

          {status ? <p className="notice">{status}</p> : null}

          {activeTab === "overview" ? (
            <section className="admin-grid">
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
                    <button type="button" className="btn btn-secondary" onClick={resetCurrentDraft}>恢复草稿</button>
                  </div>
                </div>

                <p className="meta" style={{ margin: 0 }}>首页横幅标签、标题和说明现在都能在预览区内直接修改，图片仍支持右键替换。</p>
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
                <p className="meta" style={{ margin: 0 }}>封面图可右键替换，详情图集请在右侧编辑器内上传并组织。</p>
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
                  {works.map((work) => (
                    <article key={work.id} className="panel work-admin-item">
                      <div className="admin-work-row">
                        <EditableImage enabled label={`${work.title} 封面图`} slot={`work-cover-${work.id}`} onUploaded={(url) => handleWorkCoverUpload(work.id, url)}>
                          {(bindProps, state) => (
                            <div className="admin-work-thumb" onContextMenu={bindProps.onContextMenu} title={bindProps.title}>
                              <img className="admin-work-thumb-image" src={resolveWorkCoverUrl(work.coverUrl)} alt={`${work.title} 封面图`} />
                              <span className="admin-work-thumb-badge">{state.isUploading ? "上传中..." : "右键换封面"}</span>
                            </div>
                          )}
                        </EditableImage>

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
                            <button type="button" className="btn btn-secondary" onClick={() => startEditWork(work)}>编辑</button>
                            <button type="button" className="btn btn-secondary" onClick={() => void toggleFeaturedWork(work)}>{settingsDraft.featuredWorkIds.includes(work.id) ? "取消精选" : "设为精选"}</button>
                            <button type="button" className="btn btn-secondary" onClick={() => void removeWork(work.id)}>删除</button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <article className="panel stack">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>{editingWorkId ? "编辑作品" : "创建作品"}</h3>
                  <button type="button" className="btn btn-secondary" onClick={() => galleryInputRef.current?.click()} disabled={galleryUploading}>
                    {galleryUploading ? "上传中..." : "上传图集图片"}
                  </button>
                </div>

                <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => void handleGalleryUpload(event)} />

                <form key={editingWorkId ?? "new-work"} className="form-grid" onSubmit={(event) => void saveWork(event)}>
                  <label>
                    标题
                    <input value={workDraft.title ?? ""} onChange={(event) => updateWorkDraft({ title: event.target.value })} placeholder="可留空，将自动命名为未命名作品" />
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
                    <textarea value={workDraft.summary ?? ""} onChange={(event) => updateWorkDraft({ summary: event.target.value })} />
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
                    <textarea value={serializeLineList(workDraft.featureList)} onChange={(event) => updateWorkDraft({ featureList: parseLineList(event.target.value) })} rows={5} />
                  </label>
                  <label>
                    交互亮点（每行一条）
                    <textarea value={serializeLineList(workDraft.interactionPoints)} onChange={(event) => updateWorkDraft({ interactionPoints: parseLineList(event.target.value) })} rows={5} />
                  </label>
                  <label>
                    图集图片地址（每行一条，可先上传再自动写入）
                    <textarea value={serializeLineList(workDraft.galleryImages)} onChange={(event) => updateWorkDraft({ galleryImages: parseLineList(event.target.value) })} rows={6} />
                  </label>
                  <label>
                    详情补充区块
                    <textarea
                      value={serializeDetailSections(workDraft.detailSections)}
                      onChange={(event) => updateWorkDraft({ detailSections: parseDetailSections(event.target.value) })}
                      rows={8}
                      placeholder={"每个区块格式：第一行写标题，下面写正文；区块与区块之间空一行。"}
                    />
                  </label>
                  <button type="submit" className="btn btn-primary">{editingWorkId ? "保存修改" : "创建作品"}</button>
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
                      <td>{review.workId}</td>
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
                <form className="form-grid" onSubmit={(event) => void saveSettings(event)}>
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
                        updateSettingsDraft({ socialLinks: parseSocialLinks(value) });
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
                  <button type="submit" className="btn btn-primary">保存站点设置</button>
                </form>
              </section>

              <MusicClipLibraryEditor
                savedClips={settings.musicPreviewClips}
                draftClips={settingsDraft.musicPreviewClips}
                onDraftClipsChange={(clips) => updateSettingsDraft({ musicPreviewClips: clips })}
                onPersistClips={persistMusicPreviewClips}
              />
            </section>
          ) : null}

          {activeTab === "preview" ? <MobilePreviewWorkbench /> : null}
        </section>
      </div>
    </main>
  );
}



















