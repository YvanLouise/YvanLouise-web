import { PageContent, SiteSettings, SiteUiText, Work } from "../types";

export const defaultSiteUiText: SiteUiText = {
  nav: {
    home: "首页",
    about: "关于",
    works: "作品",
    commission: "委托",
    support: "支持",
    contact: "联系",
    developer: "",
    menu: "菜单",
    backToHomeAria: "返回首页",
    mainNavAria: "主导航",
    mobileNavAria: "移动端导航",
    skipToContent: "跳到主要内容"
  },
  footer: {
    copyrightPrefix: "保留所有作品与展示权利",
    afdianLabel: "爱发电",
    afdianHint: "如果你愿意，也可以在爱发电支持我的持续创作。"
  },
  pageBadges: {
    about: "关于",
    works: "作品",
    commission: "委托",
    support: "支持",
    contact: "联系"
  },
  home: {
    bannerPrimaryLabel: "支持创作",
    bannerSecondaryLabel: "最新作品",
    profileBadge: "创作者名片",
    profileDescription: "音乐、软件、游戏、动画四条创作线并行推进，用完整作品而不是碎片信息来表达自己。",
    profileStatOne: "持续更新公开作品",
    profileStatTwo: "开放支持与委托",
    featuredTitle: "精选作品",
    featuredDescription: "作品详情页支持长文案、图集展示和功能亮点展示。",
    featuredBrowseLabel: "浏览全部",
    supportTitle: "合作与支持",
    supportPrimaryLabel: "查看委托细则",
    supportSecondaryLabel: "发起私信"
  },
  works: {
    heroTitle: "分类清楚、列表直观、可继续深入浏览的作品展示页",
    heroDescription: "先按分类扫描，再进入详情页阅读长文案、看图集、体验软件或游戏的交互入口。",
    allLabel: "全部",
    allSummary: "按分类查看全部作品清单。",
    musicLabel: "音乐",
    musicTitle: "音乐作品",
    musicSummary: "原创音乐、配乐与声音实验。",
    softwareLabel: "软件",
    softwareTitle: "软件作品",
    softwareSummary: "Web 产品、工具与交互体验。",
    gameLabel: "游戏",
    gameTitle: "游戏作品",
    gameSummary: "游戏原型、系统设计与可试玩体验。",
    animationLabel: "动画",
    animationTitle: "动画作品",
    animationSummary: "动态设计、镜头节奏与视觉叙事。",
    categoryCountSuffix: "项",
    listBadge: "列表展示",
    detailButtonLabel: "查看详情",
    demoButtonLabel: "打开演示",
    emptyTitle: "这个分类暂时还没有作品",
    emptyDescription: "你可以先去看看其他分类，或者稍后再回来看看新的更新。",
    musicPreviewBadge: "随机片段预览",
    musicPreviewTitle: "从音乐片段库里抽一段随机试听",
    musicPreviewInfoEmpty: "片段库准备好后，这里会显示当前随机片段的信息。",
    musicPreviewReadyStatus: "点击按钮随机播放片段库中的音乐。",
    musicPreviewEmptyStatus: "片段库暂时还没有可播放的内容。",
    musicPreviewPlayingPrefix: "正在随机播放：",
    musicPreviewEndedPrefix: "本次随机播放结束：",
    musicPreviewPlayLabel: "随机播放",
    musicPreviewSwitchLabel: "切换随机片段",
    musicPreviewStopLabel: "停止",
    musicPreviewStoppedStatus: "播放已停止。",
    musicPreviewWaitingLabel: "等待播放"
  },
  workDetail: {
    platformLabel: "平台",
    statusLabel: "状态",
    galleryLabel: "图集",
    featuresLabel: "亮点",
    demoLabel: "打开演示",
    repoLabel: "查看仓库",
    featureTitle: "功能亮点",
    interactionTitle: "适合展示的交互点",
    feedbackTitle: "访客反馈",
    feedbackDescription: "评分和评论只会发送给你本人，其他访客看不到。",
    notFoundTitle: "未找到该作品",
    notFoundDescription: "链接可能已经失效。",
    backToWorksLabel: "返回作品页",
    loadingLabel: "加载作品中...",
    backgroundTabLabel: "项目背景",
    processTabLabel: "制作过程",
    resultTabLabel: "最终成果",
    interactionTabLabel: "交互亮点",
    noInteractionText: "这个项目目前还没有填写交互亮点。"
  },
  contact: {
    heroTitle: "发私信给我",
    heroDescription: "可以聊项目合作、委托、音乐、软件或游戏相关想法。我会统一查看并回复。",
    formAriaLabel: "联系表单",
    nameLabel: "称呼",
    contactLabel: "联系方式",
    contactPlaceholder: "邮箱 / 社媒 / 电话",
    subjectLabel: "主题",
    bodyLabel: "内容",
    submitLabel: "发送私信",
    submittingLabel: "发送中...",
    successMessage: "私信已发送，我会尽快回复你。",
    errorMessage: "发送失败，请稍后重试。"
  },
  review: {
    title: "评分与评论",
    note: "你可以提交评分与评论。为保护隐私与创作反馈质量，评论内容仅站长可见。",
    ratingLabel: "评分",
    visitorNameLabel: "你的称呼（可选）",
    visitorNamePlaceholder: "匿名访客",
    commentLabel: "评论内容",
    commentPlaceholder: "欢迎留下你对这个作品的真实感受",
    submitLabel: "提交评分与评论",
    submittingLabel: "提交中...",
    successMessage: "已提交，感谢你的反馈。",
    errorMessage: "提交失败，请稍后重试。"
  },
  commission: {
    cardDescription: "可根据需求定义交付标准、协作节点、验收方式与预算区间。",
    processTitle: "合作流程",
    processSteps: [
      "需求沟通：明确目标、风格和交付形式。",
      "方案与排期：确认范围、里程碑与报价。",
      "执行与同步：按阶段交付并持续校准。",
      "收尾与交付：完成验收、部署或上线支持。"
    ],
    ctaLabel: "发起委托"
  },
  support: {
    methodBadgePrefix: "方式",
    methodNotes: [
      "适合想直接支持我继续更新作品与实验项目的访客。",
      "适合愿意帮我传播作品、提升曝光与连接新观众的人。",
      "适合希望通过合作和委托方式长期参与创作推进的伙伴。"
    ],
    usageTitle: "你的支持会用在这些地方",
    primaryLabel: "联系合作",
    secondaryLabel: "浏览作品"
  },
  notFound: {
    title: "页面不存在",
    description: "你访问的页面可能已经移动或不存在。",
    buttonLabel: "返回首页"
  }
};

export const sampleWorks: Work[] = [
  {
    id: "w-music-01",
    title: "霓虹回声",
    type: "music",
    summary: "一张融合城市夜景氛围与故障节奏的电子 EP。",
    detailIntro: "这组音乐作品围绕深夜街道、霓虹灯与孤独漫游展开，强调氛围推进与情绪堆叠。",
    background: "我想做一套既能独立聆听，也能服务影像与游戏叙事的原创配乐作品。",
    process: "在 Ableton Live 中完成编曲，再叠加合成器纹理、环境采样和空间混音，反复校正情绪起伏。",
    result: "上线多个流媒体平台，并被独立游戏预告片和一支动画短片采用。",
    featureList: ["原创旋律动机", "多层次氛围铺陈", "可切片用于影像配乐"],
    interactionPoints: ["支持试听跳转", "按情绪段落划分章节", "封面与图集同步展示世界观参考"],
    galleryImages: [],
    detailSections: [
      { title: "声音设定", body: "整体音色偏冷，重视故障颗粒、长尾混响和低频脉冲的层层推进。" },
      { title: "应用场景", body: "适合独立游戏预告、城市夜景剪辑、角色主题音乐与实验短片。" }
    ],
    platform: "Spotify / 网易云音乐 / 视频项目",
    status: "已发布",
    coverUrl: "",
    demoUrl: "https://example.com/music/neon-echoes",
    publishedAt: "2025-12-15"
  },
  {
    id: "w-software-01",
    title: "流程板",
    type: "software",
    summary: "把想法整理成可执行路线图的创作型 Web 应用。",
    detailIntro: "这是一个面向创作者与小团队的流程规划工具，重点在于把灵感快速转成结构化任务。",
    background: "我需要一套更清晰的方法，把脑中的灵感沉淀成阶段目标、任务列表和交付节点。",
    process: "使用 React 与 Node.js 开发，围绕项目拆解、拖拽排序、阶段推进和移动端访问体验迭代。",
    result: "已经被自由职业团队用于管理内容发布节奏，也成为我展示产品思路与交互能力的代表项目。",
    featureList: ["卡片式任务拆解", "阶段看板与时间线切换", "移动端友好的快速录入"],
    interactionPoints: ["详情页提供演示入口与仓库入口", "图集展示关键界面", "功能亮点采用可扫描列表呈现"],
    galleryImages: [],
    detailSections: [
      { title: "交互重点", body: "通过大面积信息分组和清晰的按钮层级，让项目推进状态一眼可见。" },
      { title: "适用对象", body: "适合内容团队、独立开发者、小型工作室和需要快速拆解项目的人。" }
    ],
    platform: "Web / iPhone / Android",
    status: "持续迭代中",
    coverUrl: "",
    demoUrl: "https://example.com/software/flowboard",
    repoUrl: "https://github.com/example/flowboard",
    publishedAt: "2026-01-28"
  },
  {
    id: "w-game-01",
    title: "回声深潜",
    type: "game",
    summary: "以声音线索驱动探索与解谜节奏的独立游戏原型。",
    detailIntro: "这个游戏原型围绕声波反馈、空间导航和轻叙事推进展开，强调触发反馈与氛围沉浸。",
    background: "我想验证一种更依赖声音与光效提示的关卡体验，让玩家在低信息环境里保持探索欲。",
    process: "先做纸面关卡，再用 Unity 搭建基础交互，持续测试玩家在声音引导下的路径选择。",
    result: "已完成核心玩法验证和一段可试玩垂直切片，可继续扩展成完整独立作品。",
    featureList: ["声音引导探索", "轻叙事关卡节奏", "适合继续扩展的系统原型"],
    interactionPoints: ["详情页支持长文案解释玩法逻辑", "可展示试玩视频和系统图", "适合放置关卡流程与交互反馈说明"],
    galleryImages: [],
    detailSections: [
      { title: "玩法核心", body: "玩家需要根据不同频段的环境反馈定位路线，并在关键节点做出节奏判断。" },
      { title: "后续扩展", body: "可继续加入敌人感知系统、非线性区域探索和多结局叙事。" }
    ],
    platform: "Windows / Web Demo",
    status: "原型完成",
    coverUrl: "",
    demoUrl: "https://example.com/game/echo-dive",
    publishedAt: "2026-02-02"
  },
  {
    id: "w-animation-01",
    title: "脉冲帧",
    type: "animation",
    summary: "一组探索节奏驱动视觉语言的短篇动画作品。",
    detailIntro: "这个项目把原创音乐节拍与镜头切换节奏紧密绑定，强调视觉打击感和整体呼吸感。",
    background: "我希望做一组短篇动画，专门实验声音与画面的同步关系以及镜头节奏。",
    process: "先在 Figma 中搭建分镜，再在 After Effects 中按脚本与音乐节拍逐段完成动态设计。",
    result: "作品入选线上动态设计展映，也成为接洽动画委托时最常展示的案例之一。",
    featureList: ["分镜节奏强", "原创配乐同步驱动", "适配宣传片与片头设计"],
    interactionPoints: ["详情页图集可切换观看关键画面", "信息卡突出项目状态与应用方向", "长段文案适合解释创作方法"],
    galleryImages: [],
    detailSections: [
      { title: "视觉语言", body: "使用高对比色块、发光边缘和快速位移，形成明显的节拍反馈。" },
      { title: "交付形式", body: "可扩展到宣传动画、动态海报、片头片尾与演出视觉。" }
    ],
    platform: "短片 / 宣传视觉 / 演出屏幕",
    status: "已完成",
    coverUrl: "",
    demoUrl: "https://example.com/animation/pulse-frames",
    publishedAt: "2026-02-12"
  }
];

export const samplePages: PageContent[] = [
  {
    slug: "home",
    title: "把能听见、能使用、能感受到的故事做出来。",
    hero: "我持续创作音乐、软件、游戏与动画作品，把创意、体验和可交付结果合在同一个站点里。",
    body: "你可以在这里快速查看精选作品、合作方式、支持计划和联系入口。",
    highlights: []
  },
  {
    slug: "about",
    title: "关于我",
    hero: "我是一个把声音、代码与视觉叙事连在一起的创作者。",
    body: "我的工作横跨原创音乐、互动软件、游戏原型和动画表达，目标是做出既有气质又真正可用的作品。",
    highlights: [
      "跨音乐、软件、游戏、动画四条创作线",
      "擅长从概念到成品的完整推进",
      "支持合作开发、定制创作与长期委托"
    ]
  },
  {
    slug: "commission",
    title: "委托合作",
    hero: "我接受目标明确、沟通顺畅、愿意一起打磨品质的委托项目。",
    body: "常规流程包括需求沟通、范围确认、排期与报价、阶段交付、修改与最终验收。",
    highlights: [
      "游戏、预告、品牌短片配乐",
      "定制软件原型与创作者工具",
      "游戏玩法验证与交互体验设计",
      "宣传动画、动态视觉与片头设计"
    ]
  },
  {
    slug: "support",
    title: "支持我的创作",
    hero: "如果你喜欢我的作品，可以通过支持页帮助我持续做出更多音乐、软件、游戏和动画。",
    body: "你的支持会直接转化为新的实验项目、公开作品、制作工具和更稳定的更新节奏。",
    highlights: [
      "按次支持，帮助新作品持续发布",
      "分享作品，让更多人看到",
      "通过委托合作，推动长期创作"
    ]
  }
];

export const sampleSettings: SiteSettings = {
  siteTitle: "Yvan Louise",
  tagline: "音乐 × 软件 × 游戏 × 动画",
  primaryCtaLabel: "查看作品",
  primaryCtaHref: "/works",
  secondaryCtaLabel: "委托合作",
  secondaryCtaHref: "/commission",
  bannerBadge: "首页横幅",
  bannerHeadline: "把最近最重要的更新、开放委托和支持计划放在访客第一眼能看到的位置。",
  bannerDescription: "这里会展示你的站点横幅、头像与当前主视觉。",
  bannerImageUrl: "",
  avatarImageUrl: "",
  afdianUrl: "https://afdian.com/",
  socialLinks: [
    { label: "GitHub", url: "https://github.com/" },
    { label: "哔哩哔哩", url: "https://www.bilibili.com/" },
    { label: "网易云音乐", url: "https://music.163.com/" }
  ],
  musicPreviewClips: [],
  uiText: defaultSiteUiText
};

export function getSamplePage(slug: string): PageContent {
  const page = samplePages.find((item) => item.slug === slug);

  if (!page) {
    throw new Error(`Unknown sample page: ${slug}`);
  }

  return page;
}

export function mergePagesWithSamples(pages: PageContent[]): PageContent[] {
  const pageMap = new Map<string, PageContent>();

  samplePages.forEach((page) => {
    pageMap.set(page.slug, page);
  });

  pages.forEach((page) => {
    pageMap.set(page.slug, page);
  });

  return Array.from(pageMap.values());
}