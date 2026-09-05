import type { Locale } from "../locale";
export { normalizeLocale, type Locale } from "../locale";

type Dict = {
  nav: Record<"feed" | "radar" | "cve" | "ioc" | "exposure" | "actors" | "apt" | "veziyyet" | "scanme" | "stacknix" | "kripto" | "api" | "pricing" | "about", string>;
  footer: { tagline: string; about: string; glossary: string; guides: string; sectors: string; vendors: string; methodology: string };
  common: { check: string; search: string; loadingScan: string; networkError: string; genericError: string };
  scan: {
    eyebrow: string; h1: string; leadPre: string; leadMid: string; leadEnd: string;
    pledgeBold: string; pledgeRest: string; consoleLabel: string; placeholder: string;
    hintPre: string; hintMid: string; hintEnd: string;
    pwTitle: string; pwSubtitle: string; pwPlaceholder: string; pwNote: string;
    pwChecking: string; pwClean: string; pwUnavailable: string; pwPwned: (n: string) => string;
    honestyLabel: string; honestyText: string;
    emailResult: string; domainResult: string;
    breachTitle: string; foundBadge: (n: number) => string; nBreach: (n: number) => string;
    riskWord: string; pwExposedBold: string; pwExposedRest: string;
    exposedDataLabel: string; verified: string; passwordTag: string;
    pastesLine: (n: number) => string; moreBreaches: (n: number) => string;
    cleanTitle: string; cleanBadge: string; cleanText: string;
    unavailTitle: string; unavailText: string; invalidEmailTitle: string; invalidEmailText: string;
    sharedAddrNote: (kind: string) => string;
    attackSurface: string; subTitle: string; subUnit: string; subUnavail: string; subNotSupported: string; moreN: (n: number) => string;
    servicesTitle: string; notVisibleBadge: string; portBadge: (n: number) => string;
    cveCount: (n: number) => string; openPorts: string; noServices: (ip: string) => string;
    servicesUnavailNoIp: string; servicesUnavailShodan: string;
    intelTitle: string; timesBadge: (n: number) => string; intelDesc: string; noCoverage: string;
    intelUnavail: string; watchlistTitle: string; watchlistSeen: (p: string, d: string) => string;
    watchlistDesc: string; watchlistNoMatch: string; watchlistNoMatchDesc: string;
    invalidDomainTitle: string; invalidDomainText: string; sources: string;
    stealerTitle: string; stealerBadge: string; stealerDesc: string;
    stealerMeta: (date: string, services: number) => string; stealerCleanNote: string;
    actionsTitle: string; actionsNote: string;
    emailSecTitle: string; emailSecStrong: string; emailSecWeak: string; emailSecUnavail: string;
    emailSecUnknown: string; spoofGradeLabel: string; spoofGradeNote: (grade: string) => string;
    stealerDomTitle: string; stealerDomDesc: string; stealerDomNone: string;
    stealerDomEmp: (n: number) => string; stealerDomUsr: (n: number) => string;
    stealerDomThird: (n: number) => string; stealerDomFallback: (n: number) => string;
    localActionLabel: string;
  };
  actors: {
    eyebrow: string; h1: string; leadPre: string; leadMid: string; leadEnd: string;
    consoleLabel: string; placeholder: string; examples: string;
    searching: string; resultFor: (q: string) => string; matchNote: string;
    empty: (q: string) => string; totalNote: (n: number, q: string) => string;
    leadingTitle: string; leadingNote: string; rosterEmpty: string;
    originLabel: string; sponsorSuffix: string; targetCountries: string; targetSectors: string;
    recentLabel: string; sourceLabel: string; refWord: (n: number) => string; matchScore: string;
    recentActivity: (n: number) => string; sourcesLine: (t: string, a: number, az: number, d: string) => string;
    nameleum: string;
    techniquesLabel: string; malwareLabel: string; toolsLabel: string;
    observedCountries: string; observedSectors: string; victimsLabel: (n: number) => string;
    lastActiveLabel: string; confidenceLabel: string; confidenceBand: (n: number) => string;
    regionalTitle: string; regionalNote: string; moreWord: (n: number) => string;
    relatedLabel: string;
    searchExamples: string[];
    rName: string; rAlias: string; rTargets: string; rSector: string; rRecent: string;
  };
  feed: {
    emptyFeed: string; filterEmpty: string; grounded: string; source: string;
    moreSources: (n: number) => string; moreSourcesTitle: string;
    railKev: (n: number) => string; railAz: (n: number) => string;
    cveRegistry: string; archivePre: string; archiveSuf: string;
    toolExposure: string; exposureHosts: (n: string) => string; exposureFallback: string;
    toolIoc: string; iocTitle: string; toolKripto: string; kriptoTitle: string;
    refreshing: string; newStories: (n: number) => string;
    spektr: (n: number) => string; spektrFilter: string; dispatchWord: string;
  };
  stack: {
    title: string; setupPrompt: string; setupCta: string; edit: string; done: string;
    matchLine: (n: number, m: number) => string; none: string; hint: string;
  };
};

const az: Dict = {
  nav: { feed: "Lent", radar: "Radar", cve: "CVE", ioc: "IOC", exposure: "Exposure", actors: "Aktorlar", apt: "APT Atlas", veziyyet: "Vəziyyət", scanme: "Özünü yoxla", stacknix: "stacknix", kripto: "Kripto", api: "API", pricing: "Qiymət", about: "Haqqında" },
  footer: { tagline: "~60 mənbə → AI qiymətləndirmə və yoxlama → Azərbaycan dilində. 24/7, insan müdaxiləsi olmadan.", about: "haqqında", glossary: "lüğət", guides: "hücum növləri", sectors: "sektorlar", vendors: "vendorlar", methodology: "metodologiya" },
  common: { check: "Yoxla", search: "Axtar", loadingScan: "skan edilir…", networkError: "Şəbəkə xətası — yenidən cəhd edin", genericError: "Xəta baş verdi" },
  scan: {
    eyebrow: "Şəxsi exposure yoxlaması",
    h1: "Sən internetdə nə qədər açıqdasan?",
    leadPre: "E-poçt ünvanını və ya iş domain-ini yaz — sənə düz cavab verək: ünvanın hansı ",
    leadMid: "breach",
    leadEnd: "-lərdə görünüb, və domain-inin nə qədəri açıq internetdə görünür. Heç nə uydurmuruq.",
    pledgeBold: "Uydurma atribusiya yoxdur.",
    pledgeRest: " Hər fakt mənbəsi ilə gəlir; təsdiqləyə bilmədiyimizi unavailable kimi göstəririk.",
    consoleLabel: "skopnix scan · e-poçt və ya domain",
    placeholder: "namiq@example.az  və ya  example.az",
    hintPre: "@", hintMid: " varsa → e-poçt breach yoxlaması · yoxdursa → domain attack surface. ", hintEnd: "",
    pwTitle: "Parolunu yoxla",
    pwSubtitle: "brauzerdən çıxmır",
    pwPlaceholder: "yoxlamaq istədiyin parol",
    pwNote: "Parol brauzerdə hash-lənir; serverə yalnız hash-ın ilk 5 simvolu gedir (k-anonymity). Parolun özü heç yerə göndərilmir.",
    pwChecking: "yoxlanılır…",
    pwClean: "Bu parol məlum breach-lərdə görünmür. Yenə də güclü və unikal saxla.",
    pwUnavailable: "Servis cavab vermədi — bir azdan yenidən yoxla.",
    pwPwned: (n) => `Bu parol məlum breach-lərdə ${n} dəfə görünüb — istifadə etmə, dərhal dəyiş.`,
    honestyLabel: "Dürüstlük qaydası",
    honestyText: "Servis cavab vermədikdə sənə «təmizsən» demirik — çünki bunu bilmirik. Bunun əvəzinə açıq şəkildə unavailable qaytarırıq. E-poçt ünvanın yalnız bir sorğu üçün istifadə olunur — heç yerdə saxlanmır.",
    emailResult: "E-poçt nəticəsi",
    domainResult: "Domain nəticəsi",
    breachTitle: "Breach yoxlaması",
    foundBadge: (n) => `tapıldı · ${n}`,
    nBreach: (n) => `${n} breach`,
    riskWord: "risk",
    pwExposedBold: "Parolların sızıb.",
    pwExposedRest: " Bu servislərdəki parolu dərhal dəyiş və hər yerdə 2FA aktiv et. Eyni parolu başqa yerdə işlətmisənsə, onu da dəyiş.",
    exposedDataLabel: "Sızan məlumat növləri",
    verified: "✓ təsdiqlənib",
    passwordTag: "parol",
    pastesLine: (n) => `Bundan başqa ${n} paste/leak-də görünüb (mətn dump-ları).`,
    moreBreaches: (n) => `+ daha ${n} breach`,
    cleanTitle: "Məlum breach-lərdə görünmür",
    cleanBadge: "təmiz",
    cleanText: "Bu ünvan XposedOrNot bazasında tapılmadı. Bu, siyahıya əsaslanan nəticədir — zəmanət deyil. Yenə də güclü parol və 2FA saxla.",
    unavailTitle: "Breach servisi əlçatan deyil",
    unavailText: "XposedOrNot hazırda cavab vermir. Sənə «təmizsən» demirik — bir azdan yenidən yoxla.",
    invalidEmailTitle: "Düzgün e-poçt yaz",
    invalidEmailText: "Bu, düzgün formatda e-poçt ünvanı deyil, ona görə heç bir sorğu göndərilmədi.",
    sharedAddrNote: (kind) =>
      kind === "example"
        ? "Bu nümunə/placeholder ünvandır (məs. example.com) — nəticələr bu ünvanı işlədən minlərlə adamındır, sənin şəxsi məlumatın deyil."
        : kind === "role"
          ? "Bu ortaq poçt qutusudur (info@, admin@ kimi) — sızmalar bir neçə işçiyə aiddir, tək bir şəxsə yox."
          : kind === "disposable"
            ? "Bu birdəfəlik/müvəqqəti poçt domenidir — nəticələr çoxlu istifadəçi arasında paylaşılır."
            : "",
    attackSurface: "Domain attack surface",
    subTitle: "Subdomain-lar", subUnit: "CT log-larında görünən ad",
    subUnavail: "CT log-ları cavab vermədi — «0 subdomain» demirik, sadəcə indi yoxlaya bilmədik.",
    subNotSupported: "gov.az kimi ictimai reyestr domenlərində bütün subdomain-ları saymaq mümkün deyil — konkret subdomain (məs. asan.gov.az) yoxla.",
    moreN: (n) => `+ daha ${n}`,
    servicesTitle: "Açıq servislər", notVisibleBadge: "görünmür",
    portBadge: (n) => `${n} port`, cveCount: (n) => `${n} CVE`, openPorts: "açıq portlar",
    noServices: (ip) => `Shodan bu host-da (${ip}) internetə açıq servis görmür — yaxşı əlamətdir.`,
    servicesUnavailNoIp: "Domain bir IP-yə həll olunmadı — açıq servisləri yoxlaya bilmədik.",
    servicesUnavailShodan: "Shodan cavab vermədi — bir azdan yenidən yoxla.",
    intelTitle: "Bizim intel", timesBadge: (n) => `${n} dəfə`,
    intelDesc: "bu domain qeyd olunub", noCoverage: "Bu domain haqqında hələ yazımız yoxdur.",
    intelUnavail: "Baza hazırda əlçatan deyil — yoxlaya bilmədik.",
    watchlistTitle: "Watchlist",
    watchlistSeen: (p, d) => `Azərbaycanda görünən ${p} (${d})`,
    watchlistDesc: "Domain kütləvi istismar olunan bir product-la üst-üstə düşür — regional exposure yüksəkdir.",
    watchlistNoMatch: "uyğunluq yox",
    watchlistNoMatchDesc: "Bu domain izlənən kütləvi-istismar product-larından birini adlandırmır.",
    invalidDomainTitle: "Düzgün domain yaz", invalidDomainText: "Bu, düzgün domain deyil. Nümunə: example.az",
    sources: "Mənbələr: XposedOrNot + LeakCheck (breach), HIBP Pwned Passwords (k-anonymity), Hudson Rock (info-stealer), certspotter + crt.sh, MX/SPF/DMARC (DNS), Shodan InternetDB, skopnix coverage, və həftəlik Shodan AZ snapshot. Hamısı açarsız/pulsuz — e-poçt və parolun heç yerdə saxlanmır.",
    stealerTitle: "Cihaz info-stealer ilə yoluxub",
    stealerBadge: "kritik",
    stealerDesc: "Bu ünvan info-stealer ilə yoluxmuş bir kompüterlə bağlıdır. Bu, adi breach-dən daha ağırdır: brauzerdə saxlanan bütün parollar, cookie və token-lər oğurlanıb.",
    stealerMeta: (date, services) => `Son yoluxma: ${date} · risk altında ${services.toLocaleString("en-US")} xidmət`,
    stealerCleanNote: "Breach bazalarında görünmür, amma cihaz yoluxub — aşağıdakı addımlar hələ də vacibdir.",
    actionsTitle: "Nə etməli",
    actionsNote: "Sızan məlumat növünə görə prioritetləşdirilib — kritikdən başla.",
    localActionLabel: "Azərbaycanda",
    emailSecTitle: "E-poçt saxtalaşdırma qorunması",
    emailSecStrong: "Bu domain e-poçt saxtalaşdırmasına (spoofing) qarşı qorunur.",
    emailSecWeak: "DMARC yoxdur və ya zəifdir — bu domain fişinqdə saxtalaşdırıla bilər. p=reject-li DMARC əlavə et.",
    emailSecUnavail: "DNS qeydləri oxunmadı.",
    emailSecUnknown: "yoxlanılmadı",
    spoofGradeLabel: "Spoofing qiyməti",
    spoofGradeNote: (g) =>
      g === "A" ? "Əla — DMARC p=reject və SPF tam tənzimlənib."
        : g === "B" ? "Yaxşı — DMARC p=reject var, SPF-i də möhkəmləndir (-all)."
        : g === "C" ? "Orta — DMARC p=quarantine. p=reject-ə keç."
        : g === "D" ? "Zəif — DMARC tətbiq olunmur; SPF var, amma from-saxtalaşdırma mümkündür."
        : "Kritik — DMARC yoxdur/p=none: bu domenin adından saxta məktub göndərmək asandır.",
    stealerDomTitle: "Info-stealer sızmaları",
    stealerDomDesc: "Bu domenə aid kredensiallar info-stealer log-larında görünüb — yoluxmuş cihazlardan oğurlanıb.",
    stealerDomNone: "Bu domen info-stealer log-larında görünmür.",
    stealerDomEmp: (n) => `${n.toLocaleString("en-US")} işçi krediti`,
    stealerDomUsr: (n) => `${n.toLocaleString("en-US")} istifadəçi/müştəri krediti`,
    stealerDomThird: (n) => `${n.toLocaleString("en-US")} üçüncü-tərəf krediti`,
    stealerDomFallback: (n) => `${n.toLocaleString("en-US")} qeyd (təfərrüat əlçatan deyil)`,
  },
  actors: {
    eyebrow: "APT-lər və crime qrupları",
    h1: "Səni kim hədəf alır?",
    leadPre: "Ölkə, sektor və ya şirkət adı yaz — hansı ",
    leadMid: "APT",
    leadEnd: " və crime qruplarının onu hədəf aldığını göstərək. Hər cavab mənbəyə bağlıdır: yalnız mənbənin açıq bildirdiyini qaytarırıq, uydurulmuş əlaqə yoxdur.",
    consoleLabel: "actors --who <ölkə | sektor | ad>",
    placeholder: "ölkə · sektor · qrup adı",
    examples: "nümunə:",
    searching: "axtarılır…",
    resultFor: (q) => `Nəticə: “${q}”`,
    matchNote: "match_reasons = niyə uyğun gəldi",
    empty: (q) => `Heç bir aktor “${q}”-i açıq hədəf kimi bildirmir. Bildirməyən aktorlar burada görünmür — bu, məhsulun dürüstlük qaydasıdır, uydurulmuş əlaqə yoxdur.`,
    totalNote: (n, q) => `Cəmi ${n} aktor “${q}”-i açıq hədəf kimi bildirir. Bildirməyən aktorlar burada görünmür.`,
    leadingTitle: "Aparıcı təhdid aktorları",
    leadingNote: "ATT&CK dərinliyi + aktivliyə görə",
    rosterEmpty: "Aktor rosteri hazırlanır — həftəlik ETL ilk dəfə işləyəndə burada olacaq.",
    originLabel: "mənşə (suspected)",
    sponsorSuffix: "dövlət sponsoru",
    targetCountries: "hədəf ölkələr (mənbənin bildirdiyi)",
    targetSectors: "hədəf sektorlar",
    recentLabel: "son fəaliyyət · bizim intel",
    sourceLabel: "source",
    refWord: (n) => `${n} ref →`,
    matchScore: "match_score",
    recentActivity: (n) => `recent activity: ${n}`,
    sourcesLine: (t, a, az, d) => `Mənbələr: MISP Galaxy + ransomware.live + MITRE ATT&CK, son fəaliyyət bizim item-lərlə ad-join. Roster ${t} aktor (${a} aktiv, ${az} Azərbaycanca)${d ? ` · yeniləndi ${d}` : ""}. Axtarış bütün rosteri əhatə edir.`,
    nameleum: "naməlum",
    techniquesLabel: "texnikalar · ATT&CK",
    malwareLabel: "malware",
    toolsLabel: "alətlər",
    observedCountries: "müşahidə olunan qurbanlar (ölkə)",
    observedSectors: "müşahidə olunan sektorlar",
    victimsLabel: (n) => `${n} qurban`,
    lastActiveLabel: "son aktivlik",
    confidenceLabel: "atribusiya etibarı",
    confidenceBand: (n) => (n >= 75 ? "yüksək" : n >= 50 ? "orta" : "aşağı · suspected"),
    regionalTitle: "Azərbaycan və Cənubi Qafqazı hədəf alanlar",
    regionalNote: "regional prioritet",
    moreWord: (n) => `+${n}`,
    relatedLabel: "əlaqəli qruplar · MISP",
    searchExamples: ["Azərbaycan", "maliyyə", "energetika", "Lazarus"],
    rName: "ad uyğunluğu", rAlias: "alias", rTargets: "hədəf",
    rSector: "hədəf sektor", rRecent: "son fəaliyyət",
  },
  feed: {
    emptyFeed: "hələ heç bir dispaç dərc olunmayıb",
    filterEmpty: "bu filtrə uyğun dispaç yoxdur",
    grounded: "əsaslandırılıb ✓",
    source: "mənbə",
    moreSources: (n) => `+${n} mənbə`,
    moreSourcesTitle: "eyni hadisəni bildirən digər mənbələr",
    railKev: (n) => `KEV · aktiv istismar ${n}`,
    railAz: (n) => `AZ · regional ${n}`,
    cveRegistry: "CVE reyestri →",
    archivePre: "arxiv:", archiveSuf: "dispaç",
    toolExposure: "Alət · Exposure",
    exposureHosts: (n) => `Azərbaycanda ${n} açıq host`,
    exposureFallback: "Hücum səthi mənzərəsi",
    toolIoc: "Alət · IOC / CVE", iocTitle: "Göstərici və CVE yoxlaması",
    toolKripto: "Alət · Kripto", kriptoTitle: "Kripto ünvan kəşfiyyatı",
    refreshing: "yenilənir…", newStories: (n) => `${n} yeni xəbər · yenilə`,
    spektr: (n) => `Son ${n} dispaç · spektr`, spektrFilter: "Kateqoriya spektri — süzgəc", dispatchWord: "dispaç",
  },
  stack: {
    title: "Mənim stekim",
    setupPrompt: "İşlətdiyin məhsulları seç — hər səhər «bu gün mənə aid nə var?» sualına cavab alacaqsan.",
    setupCta: "Stek qur",
    edit: "dəyiş",
    done: "hazır",
    matchLine: (n, m) => `${m} dispaçdan ${n}-i sənin stekinə aiddir`,
    none: "Bu gün lentdə sənin stekinə aid heç nə yoxdur.",
    hint: "Yerli saxlanır — hesab yoxdur, heç yerə göndərilmir.",
  },
};

const en: Dict = {
  nav: { feed: "Feed", radar: "Radar", cve: "CVE", ioc: "IOC", exposure: "Exposure", actors: "Actors", apt: "APT Atlas", veziyyet: "Situation", scanme: "Scan me", stacknix: "stacknix", kripto: "Crypto", api: "API", pricing: "Pricing", about: "About" },
  footer: { tagline: "The world\u2019s threats, filed where you can read them. Quietly, continuously.", about: "about", glossary: "glossary", guides: "attack types", sectors: "sectors", vendors: "vendors", methodology: "methodology" },
  common: { check: "Check", search: "Search", loadingScan: "scanning…", networkError: "Network error — try again", genericError: "Something went wrong" },
  scan: {
    eyebrow: "Personal exposure check",
    h1: "How exposed are you online?",
    leadPre: "Enter your email address or work domain and we'll answer straight: which ",
    leadMid: "breaches",
    leadEnd: " your address has appeared in, and how much of your domain is visible on the open internet. We invent nothing.",
    pledgeBold: "No fabricated attribution.",
    pledgeRest: " Every finding is grounded; what we can't confirm we show as unavailable.",
    consoleLabel: "skopnix scan · email or domain",
    placeholder: "you@example.com  or  example.com",
    hintPre: "@", hintMid: " present → email breach check · otherwise → domain attack surface. ", hintEnd: "",
    pwTitle: "Check your password",
    pwSubtitle: "never leaves your browser",
    pwPlaceholder: "the password to check",
    pwNote: "The password is hashed in your browser; only the first 5 characters of the hash reach the server (k-anonymity). The password itself is never sent anywhere.",
    pwChecking: "checking…",
    pwClean: "This password isn't in known breaches. Still, keep it strong and unique.",
    pwUnavailable: "Service didn't respond — try again shortly.",
    pwPwned: (n) => `This password has appeared ${n} times in known breaches — don't use it, change it now.`,
    honestyLabel: "Honesty rule",
    honestyText: "When a service doesn't respond we don't tell you «you're clean» — because we don't know. Instead we clearly return unavailable. Your email is used for a single lookup — never stored anywhere.",
    emailResult: "Email result",
    domainResult: "Domain result",
    breachTitle: "Breach check",
    foundBadge: (n) => `found · ${n}`,
    nBreach: (n) => `${n} breaches`,
    riskWord: "risk",
    pwExposedBold: "Your passwords leaked.",
    pwExposedRest: " Change the password on these services now and enable 2FA everywhere. If you reused it elsewhere, change that too.",
    exposedDataLabel: "Leaked data types",
    verified: "✓ verified",
    passwordTag: "password",
    pastesLine: (n) => `Also seen in ${n} paste/leak dumps.`,
    moreBreaches: (n) => `+ ${n} more breaches`,
    cleanTitle: "Not found in known breaches",
    cleanBadge: "clean",
    cleanText: "This address wasn't found in the breach data we check. This is a list-based result — not a guarantee. Still keep a strong password and 2FA.",
    unavailTitle: "Breach service unavailable",
    unavailText: "The breach check isn't responding right now. We won't say «you're clean» — try again shortly.",
    invalidEmailTitle: "Enter a valid email",
    invalidEmailText: "That isn't a well-formed email address, so no lookup was made.",
    sharedAddrNote: (kind) =>
      kind === "example"
        ? "This is a placeholder/example address (e.g. example.com) — the results belong to the thousands of people who use it, not to you."
        : kind === "role"
          ? "This is a shared mailbox (info@, admin@…) — the breaches belong to several staff, not one person."
          : kind === "disposable"
            ? "This is a disposable/temporary-mail domain — the results are shared across many users."
            : "",
    attackSurface: "Domain attack surface",
    subTitle: "Subdomains", subUnit: "names seen in CT logs",
    subUnavail: "CT logs didn't respond — we don't say «0 subdomains», we just couldn't check right now.",
    subNotSupported: "Public-registry domains like gov.az can't be enumerated as a whole — scan a specific subdomain (e.g. asan.gov.az) instead.",
    moreN: (n) => `+ ${n} more`,
    servicesTitle: "Open services", notVisibleBadge: "not visible",
    portBadge: (n) => `${n} ports`, cveCount: (n) => `${n} CVEs`, openPorts: "open ports",
    noServices: (ip) => `No internet-exposed services on this host (${ip}) — a good sign.`,
    servicesUnavailNoIp: "The domain didn't resolve to an IP — couldn't check open services.",
    servicesUnavailShodan: "The exposure check didn't respond — try again shortly.",
    intelTitle: "Our intel", timesBadge: (n) => `${n}×`,
    intelDesc: "we have flagged this domain", noCoverage: "We haven't written about this domain yet.",
    intelUnavail: "The database is unavailable right now — couldn't check.",
    watchlistTitle: "Watchlist",
    watchlistSeen: (p, d) => `${p} — mass-exploited in the wild (${d})`,
    watchlistDesc: "The domain overlaps a mass-exploited product — exposure is high.",
    watchlistNoMatch: "no match",
    watchlistNoMatchDesc: "This domain doesn't name one of the tracked mass-exploit products.",
    invalidDomainTitle: "Enter a valid domain", invalidDomainText: "That isn't a valid domain. Example: example.com",
    sources: "Sources: XposedOrNot + LeakCheck (breach), HIBP Pwned Passwords (k-anonymity), Hudson Rock (infostealer), certspotter + crt.sh, MX/SPF/DMARC (DNS), Shodan InternetDB, skopnix coverage, and the weekly Shodan AZ snapshot. All keyless/free — your email and password are never stored.",
    stealerTitle: "Your device was infostealer-infected",
    stealerBadge: "critical",
    stealerDesc: "This address is tied to a computer infected by an info-stealer. That's more serious than a breach: every password, cookie and token saved in the browser was stolen.",
    stealerMeta: (date, services) => `Last infection: ${date} · ${services.toLocaleString("en-US")} services at risk`,
    stealerCleanNote: "Not in breach databases, but the device is infected — the steps below still matter.",
    actionsTitle: "What to do",
    actionsNote: "Prioritized by the type of data exposed — start with the critical items.",
    localActionLabel: "In Azerbaijan",
    emailSecTitle: "Email spoofing defense",
    emailSecStrong: "This domain is protected against email spoofing.",
    emailSecWeak: "No or weak DMARC — this domain can be spoofed in phishing. Add a DMARC record with p=reject.",
    emailSecUnavail: "Couldn't read DNS records.",
    emailSecUnknown: "not checked",
    spoofGradeLabel: "Spoofing grade",
    spoofGradeNote: (g) =>
      g === "A" ? "Excellent — DMARC p=reject with a fully-qualified SPF."
        : g === "B" ? "Good — DMARC p=reject; tighten SPF too (-all)."
        : g === "C" ? "Fair — DMARC p=quarantine. Move to p=reject."
        : g === "D" ? "Weak — DMARC isn't enforced; SPF exists, but from-header spoofing is possible."
        : "Critical — no DMARC / p=none: sending forged mail from this domain is easy.",
    stealerDomTitle: "Infostealer exposure",
    stealerDomDesc: "Credentials for this domain appear in infostealer logs — stolen from infected devices.",
    stealerDomNone: "This domain doesn't appear in infostealer logs.",
    stealerDomEmp: (n) => `${n.toLocaleString("en-US")} employee creds`,
    stealerDomUsr: (n) => `${n.toLocaleString("en-US")} user/customer creds`,
    stealerDomThird: (n) => `${n.toLocaleString("en-US")} third-party creds`,
    stealerDomFallback: (n) => `${n.toLocaleString("en-US")} records (breakdown unavailable)`,
  },
  actors: {
    eyebrow: "APTs and crime groups",
    h1: "Who's targeting you?",
    leadPre: "Enter a country, sector, or company name — and we'll show which ",
    leadMid: "APT",
    leadEnd: " and crime groups target it. We show only what's openly stated \u2014 no invented links.",
    consoleLabel: "actors --who <country | sector | name>",
    placeholder: "country · sector · group name",
    examples: "examples:",
    searching: "searching…",
    resultFor: (q) => `Result: “${q}”`,
    matchNote: "match_reasons = why it matched",
    empty: (q) => `No actor openly states “${q}” as a target. Actors that don't state it don't appear here — that's the product's honesty rule, no invented links.`,
    totalNote: (n, q) => `${n} actors openly state “${q}” as a target. Actors that don't state it don't appear here.`,
    leadingTitle: "Leading threat actors",
    leadingNote: "the best-documented first",
    rosterEmpty: "The actor roster is being built — it'll appear here after the weekly ETL first runs.",
    originLabel: "origin (suspected)",
    sponsorSuffix: "state-sponsored",
    targetCountries: "target countries (as stated by the source)",
    targetSectors: "target sectors",
    recentLabel: "recent activity · our intel",
    sourceLabel: "source",
    refWord: (n) => `${n} refs →`,
    matchScore: "match_score",
    recentActivity: (n) => `recent activity: ${n}`,
    sourcesLine: (t, a, az, d) => `Sources: MISP Galaxy + ransomware.live + MITRE ATT&CK, recent activity name-joined with our items. Roster ${t} actors (${a} active, ${az} tracked in the Caucasus)${d ? ` · updated ${d}` : ""}. Search covers the whole roster.`,
    nameleum: "unknown",
    techniquesLabel: "techniques · ATT&CK",
    malwareLabel: "malware",
    toolsLabel: "tools",
    observedCountries: "observed victims (by country)",
    observedSectors: "observed sectors",
    victimsLabel: (n) => `${n} victims`,
    lastActiveLabel: "last active",
    confidenceLabel: "attribution confidence",
    confidenceBand: (n) => (n >= 75 ? "high" : n >= 50 ? "medium" : "low · suspected"),
    regionalTitle: "Targeting Azerbaijan & the Caucasus",
    regionalNote: "regional priority",
    moreWord: (n) => `+${n}`,
    relatedLabel: "related groups",
    searchExamples: ["Ukraine", "finance", "energy", "Lazarus"],
    rName: "name match", rAlias: "alias", rTargets: "targets",
    rSector: "targets sector", rRecent: "recent activity",
  },
  feed: {
    emptyFeed: "no dispatches published yet",
    filterEmpty: "no dispatches match this filter",
    grounded: "grounded ✓",
    source: "source",
    moreSources: (n) => `+${n} sources`,
    moreSourcesTitle: "other outlets reporting the same story",
    railKev: (n) => `KEV · actively exploited ${n}`,
    railAz: (n) => `AZ · regional ${n}`,
    cveRegistry: "CVE registry →",
    archivePre: "archive:", archiveSuf: "dispatches",
    toolExposure: "Tool · Exposure",
    exposureHosts: (n) => `${n} exposed hosts in Azerbaijan`,
    exposureFallback: "Attack-surface picture",
    toolIoc: "Tool · IOC / CVE", iocTitle: "Indicator and CVE lookup",
    toolKripto: "Tool · Crypto", kriptoTitle: "Crypto address intel",
    refreshing: "refreshing…", newStories: (n) => `${n} new stories · refresh`,
    spektr: (n) => `Last ${n} dispatches · spectrum`, spektrFilter: "Category spectrum — filter", dispatchWord: "dispatches",
  },
  stack: {
    title: "My stack",
    setupPrompt: "Pick the products you run — then every morning you'll see what today's feed means for you.",
    setupCta: "Set up",
    edit: "edit",
    done: "done",
    matchLine: (n, m) => `${n} of ${m} dispatches touch your stack`,
    none: "Nothing in today's feed touches your stack.",
    hint: "Stored locally — no account, never sent anywhere.",
  },
};

const DICTS: Record<Locale, Dict> = { az, en };
export function getDict(locale: Locale): Dict {
  return DICTS[locale] ?? az;
}
