export type WorkType = "music" | "software" | "game" | "animation";

export interface WorkDetailSection {
  title: string;
  body: string;
}

export interface MusicPreviewClip {
  id: string;
  label: string;
  sourceUrl: string;
  sourceName: string;
  startTime: number;
  endTime: number;
}

export interface SiteUiText {
  nav: {
    home: string;
    about: string;
    works: string;
    commission: string;
    support: string;
    contact: string;
    developer: string;
    menu: string;
    backToHomeAria: string;
    mainNavAria: string;
    mobileNavAria: string;
    skipToContent: string;
  };
  footer: {
    copyrightPrefix: string;
    afdianLabel: string;
    afdianHint: string;
  };
  pageBadges: {
    about: string;
    works: string;
    commission: string;
    support: string;
    contact: string;
  };
  home: {
    bannerPrimaryLabel: string;
    bannerSecondaryLabel: string;
    profileBadge: string;
    profileDescription: string;
    profileStatOne: string;
    profileStatTwo: string;
    featuredTitle: string;
    featuredDescription: string;
    featuredBrowseLabel: string;
    supportTitle: string;
    supportPrimaryLabel: string;
    supportSecondaryLabel: string;
  };
  works: {
    heroTitle: string;
    heroDescription: string;
    allLabel: string;
    allSummary: string;
    musicLabel: string;
    musicTitle: string;
    musicSummary: string;
    softwareLabel: string;
    softwareTitle: string;
    softwareSummary: string;
    gameLabel: string;
    gameTitle: string;
    gameSummary: string;
    animationLabel: string;
    animationTitle: string;
    animationSummary: string;
    categoryCountSuffix: string;
    listBadge: string;
    detailButtonLabel: string;
    demoButtonLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    musicPreviewBadge: string;
    musicPreviewTitle: string;
    musicPreviewInfoEmpty: string;
    musicPreviewReadyStatus: string;
    musicPreviewEmptyStatus: string;
    musicPreviewPlayingPrefix: string;
    musicPreviewEndedPrefix: string;
    musicPreviewPlayLabel: string;
    musicPreviewSwitchLabel: string;
    musicPreviewStopLabel: string;
    musicPreviewStoppedStatus: string;
    musicPreviewWaitingLabel: string;
  };
  workDetail: {
    platformLabel: string;
    statusLabel: string;
    galleryLabel: string;
    featuresLabel: string;
    demoLabel: string;
    repoLabel: string;
    featureTitle: string;
    interactionTitle: string;
    feedbackTitle: string;
    feedbackDescription: string;
    notFoundTitle: string;
    notFoundDescription: string;
    backToWorksLabel: string;
    loadingLabel: string;
    backgroundTabLabel: string;
    processTabLabel: string;
    resultTabLabel: string;
    interactionTabLabel: string;
    noInteractionText: string;
  };
  contact: {
    heroTitle: string;
    heroDescription: string;
    formAriaLabel: string;
    nameLabel: string;
    contactLabel: string;
    contactPlaceholder: string;
    subjectLabel: string;
    bodyLabel: string;
    submitLabel: string;
    submittingLabel: string;
    successMessage: string;
    errorMessage: string;
  };
  review: {
    title: string;
    note: string;
    ratingLabel: string;
    visitorNameLabel: string;
    visitorNamePlaceholder: string;
    commentLabel: string;
    commentPlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    successMessage: string;
    errorMessage: string;
  };
  commission: {
    cardDescription: string;
    processTitle: string;
    processSteps: string[];
    ctaLabel: string;
  };
  support: {
    methodBadgePrefix: string;
    methodNotes: string[];
    usageTitle: string;
    primaryLabel: string;
    secondaryLabel: string;
  };
  notFound: {
    title: string;
    description: string;
    buttonLabel: string;
  };
}

export interface Work {
  id: string;
  title: string;
  type: WorkType;
  summary: string;
  detailIntro: string;
  background: string;
  process: string;
  result: string;
  featureList: string[];
  interactionPoints: string[];
  galleryImages: string[];
  detailSections: WorkDetailSection[];
  platform?: string;
  status?: string;
  coverUrl: string;
  demoUrl?: string;
  repoUrl?: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  workId: string;
  rating: number;
  comment: string;
  visitorName?: string;
  ownerOnly: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  name: string;
  contact: string;
  subject: string;
  body: string;
  status: "new" | "read" | "archived";
  createdAt: string;
}

export interface PageContent {
  slug: string;
  title: string;
  hero: string;
  body: string;
  highlights: string[];
  updatedAt: string;
}

export interface SocialLink {
  label: string;
  url: string;
}

export interface SiteSettings {
  siteTitle: string;
  tagline: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  bannerBadge: string;
  bannerHeadline: string;
  bannerDescription: string;
  bannerImageUrl: string;
  avatarImageUrl: string;
  afdianUrl: string;
  socialLinks: SocialLink[];
  musicPreviewClips: MusicPreviewClip[];
  featuredWorkIds: string[];
  uiText: SiteUiText;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface SiteStore {
  getWorks(type?: WorkType): Promise<Work[]>;
  getWorkById(workId: string): Promise<Work | null>;
  createWork(payload: Partial<Work>): Promise<Work>;
  updateWork(workId: string, payload: Partial<Work>): Promise<Work | null>;
  deleteWork(workId: string): Promise<boolean>;

  createReview(payload: Omit<Review, "id" | "createdAt">): Promise<Review>;
  getReviews(): Promise<Review[]>;

  createMessage(payload: Omit<Message, "id" | "status" | "createdAt">): Promise<Message>;
  getMessages(): Promise<Message[]>;

  getPage(slug: string): Promise<PageContent | null>;
  getPages(): Promise<PageContent[]>;
  upsertPage(slug: string, payload: Partial<PageContent>): Promise<PageContent>;

  getSiteSettings(): Promise<SiteSettings>;
  updateSiteSettings(payload: SiteSettings): Promise<SiteSettings>;

  getAdminByUsername(username: string): Promise<AdminUser | null>;
}
