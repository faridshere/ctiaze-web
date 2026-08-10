export type Locale = "az" | "en";

export function normalizeLocale(v: string | undefined | null): Locale {
  return v === "en" ? "en" : "az";
}

type Dict = {
  nav: Record<"feed" | "cve" | "ioc" | "exposure" | "actors" | "scanme" | "kripto" | "about", string>;
  footer: { tagline: string; about: string };
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
    attackSurface: string; subTitle: string; subUnit: string; subUnavail: string; moreN: (n: number) => string;
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
    stealerDomTitle: string; stealerDomDesc: string; stealerDomNone: string;
    stealerDomEmp: (n: number) => string; stealerDomUsr: (n: number) => string;
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
};

const az: Dict = {
  nav: { feed: "Lent", cve: "CVE", ioc: "IOC", exposure: "Exposure", actors: "Aktorlar", scanme: "Özünü yoxla", kripto: "Kripto", about: "Haqqında" },
  footer: { tagline: "~60 mənbə → AI qiymətləndirmə və yoxlama → Azərbaycan dilində. 24/7, insan müdaxiləsi olmadan.", about: "haqqında" },
  common: { check: "Yoxla", search: "Axtar", loadingScan: "skan edilir…", networkError: "Şəbəkə xətası — yenidən cəhd edin", genericError: "Xəta baş verdi" },
  scan: {
    eyebrow: "Şəxsi exposure yoxlaması",
    h1: "Sən internetdə nə qədər açıqdasan?",
    leadPre: "E-poçt ünvanını və ya iş domain-ini yaz — sənə düz cavab verək: ünvanın hansı ",
    leadMid: "breach",
    leadEnd: "-lərdə görünüb, və domain-inin nə qədəri açıq internetdə görünür. Heç nə uydurmuruq.",
    pledgeBold: "False positive yoxdur.",
    pledgeRest: " Hər fakt mənbəsi ilə gəlir; təsdiqləyə bilmədiyimizi unavailable kimi göstəririk.",
    consoleLabel: "ctiaze scan · e-poçt və ya domain",
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
    attackSurface: "Domain attack surface",
    subTitle: "Subdomain-lar", subUnit: "CT log-larında görünən ad",
    subUnavail: "CT log-ları cavab vermədi — «0 subdomain» demirik, sadəcə indi yoxlaya bilmədik.",
    moreN: (n) => `+ daha ${n}`,
    servicesTitle: "Açıq servislər", notVisibleBadge: "görünmür",
    portBadge: (n) => `${n} port`, cveCount: (n) => `${n} CVE`, openPorts: "açıq portlar",
    noServices: (ip) => `Shodan bu host-da (${ip}) internetə açıq servis görmür — yaxşı əlamətdir.`,
    servicesUnavailNoIp: "Domain bir IP-yə həll olunmadı — açıq servisləri yoxlaya bilmədik.",
    servicesUnavailShodan: "Shodan cavab vermədi — bir azdan yenidən yoxla.",
    intelTitle: "Bizim intel", timesBadge: (n) => `${n} dəfə`,
    intelDesc: "@ctiaze bu domain-i xatırlayıb", noCoverage: "Bu domain haqqında hələ yazımız yoxdur.",
    intelUnavail: "Baza hazırda əlçatan deyil — yoxlaya bilmədik.",
    watchlistTitle: "Shodan watchlist",
    watchlistSeen: (p, d) => `Azərbaycanda görünən ${p} (${d})`,
    watchlistDesc: "Domain kütləvi istismar olunan bir product-la üst-üstə düşür — regional exposure yüksəkdir.",
    watchlistNoMatch: "uyğunluq yox",
    watchlistNoMatchDesc: "Bu domain izlənən kütləvi-istismar product-larından birini adlandırmır.",
    invalidDomainTitle: "Düzgün domain yaz", invalidDomainText: "Bu, düzgün domain deyil. Nümunə: example.az",
    sources: "Mənbələr: XposedOrNot + LeakCheck (breach), HIBP Pwned Passwords (k-anonymity), Hudson Rock (info-stealer), certspotter + crt.sh, MX/SPF/DMARC (DNS), Shodan InternetDB, ctiaze coverage, və həftəlik Shodan AZ snapshot. Hamısı açarsız/pulsuz — e-poçt və parolun heç yerdə saxlanmır.",
    stealerTitle: "Cihaz info-stealer ilə yoluxub",
    stealerBadge: "kritik",
    stealerDesc: "Bu ünvan info-stealer ilə yoluxmuş bir kompüterlə bağlıdır. Bu, adi breach-dən daha ağırdır: brauzerdə saxlanan bütün parollar, cookie və token-lər oğurlanıb.",
    stealerMeta: (date, services) => `Son yoluxma: ${date} · risk altında ${services.toLocaleString("en-US")} xidmət`,
    stealerCleanNote: "Breach bazalarında görünmür, amma cihaz yoluxub — aşağıdakı addımlar hələ də vacibdir.",
    actionsTitle: "Nə etməli",
    actionsNote: "Sızan məlumat növünə görə prioritetləşdirilib — kritikdən başla.",
    emailSecTitle: "E-poçt saxtalaşdırma qorunması",
    emailSecStrong: "Bu domain e-poçt saxtalaşdırmasına (spoofing) qarşı qorunur.",
    emailSecWeak: "DMARC yoxdur və ya zəifdir — bu domain fişinqdə saxtalaşdırıla bilər. p=reject-li DMARC əlavə et.",
    emailSecUnavail: "DNS qeydləri oxunmadı.",
    stealerDomTitle: "Info-stealer sızmaları",
    stealerDomDesc: "Bu domenə aid kredensiallar info-stealer log-larında görünüb — yoluxmuş cihazlardan oğurlanıb.",
    stealerDomNone: "Bu domen info-stealer log-larında görünmür.",
    stealerDomEmp: (n) => `${n.toLocaleString("en-US")} işçi krediti`,
    stealerDomUsr: (n) => `${n.toLocaleString("en-US")} istifadəçi/müştəri krediti`,
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
};

const en: Dict = {
  nav: { feed: "Feed", cve: "CVE", ioc: "IOC", exposure: "Exposure", actors: "Actors", scanme: "Scan me", kripto: "Crypto", about: "About" },
  footer: { tagline: "~60 sources → AI scoring and verification → in Azerbaijani. 24/7, no human in the loop.", about: "about" },
  common: { check: "Check", search: "Search", loadingScan: "scanning…", networkError: "Network error — try again", genericError: "Something went wrong" },
  scan: {
    eyebrow: "Personal exposure check",
    h1: "How exposed are you online?",
    leadPre: "Enter your email address or work domain and we'll answer straight: which ",
    leadMid: "breaches",
    leadEnd: " your address has appeared in, and how much of your domain is visible on the open internet. We invent nothing.",
    pledgeBold: "No false positives.",
    pledgeRest: " Every fact comes with its source; what we can't confirm we show as unavailable.",
    consoleLabel: "ctiaze scan · email or domain",
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
    cleanText: "This address wasn't found in the XposedOrNot database. This is a list-based result — not a guarantee. Still keep a strong password and 2FA.",
    unavailTitle: "Breach service unavailable",
    unavailText: "XposedOrNot isn't responding right now. We won't say «you're clean» — try again shortly.",
    invalidEmailTitle: "Enter a valid email",
    invalidEmailText: "That isn't a well-formed email address, so no lookup was made.",
    attackSurface: "Domain attack surface",
    subTitle: "Subdomains", subUnit: "names seen in CT logs",
    subUnavail: "CT logs didn't respond — we don't say «0 subdomains», we just couldn't check right now.",
    moreN: (n) => `+ ${n} more`,
    servicesTitle: "Open services", notVisibleBadge: "not visible",
    portBadge: (n) => `${n} ports`, cveCount: (n) => `${n} CVEs`, openPorts: "open ports",
    noServices: (ip) => `Shodan sees no internet-exposed services on this host (${ip}) — a good sign.`,
    servicesUnavailNoIp: "The domain didn't resolve to an IP — couldn't check open services.",
    servicesUnavailShodan: "Shodan didn't respond — try again shortly.",
    intelTitle: "Our intel", timesBadge: (n) => `${n}×`,
    intelDesc: "@ctiaze has mentioned this domain", noCoverage: "We haven't written about this domain yet.",
    intelUnavail: "The database is unavailable right now — couldn't check.",
    watchlistTitle: "Shodan watchlist",
    watchlistSeen: (p, d) => `${p} seen in Azerbaijan (${d})`,
    watchlistDesc: "The domain overlaps a mass-exploited product — regional exposure is high.",
    watchlistNoMatch: "no match",
    watchlistNoMatchDesc: "This domain doesn't name one of the tracked mass-exploit products.",
    invalidDomainTitle: "Enter a valid domain", invalidDomainText: "That isn't a valid domain. Example: example.com",
    sources: "Sources: XposedOrNot + LeakCheck (breach), HIBP Pwned Passwords (k-anonymity), Hudson Rock (infostealer), certspotter + crt.sh, MX/SPF/DMARC (DNS), Shodan InternetDB, ctiaze coverage, and the weekly Shodan AZ snapshot. All keyless/free — your email and password are never stored.",
    stealerTitle: "Your device was infostealer-infected",
    stealerBadge: "critical",
    stealerDesc: "This address is tied to a computer infected by an info-stealer. That's more serious than a breach: every password, cookie and token saved in the browser was stolen.",
    stealerMeta: (date, services) => `Last infection: ${date} · ${services.toLocaleString("en-US")} services at risk`,
    stealerCleanNote: "Not in breach databases, but the device is infected — the steps below still matter.",
    actionsTitle: "What to do",
    actionsNote: "Prioritized by the type of data exposed — start with the critical items.",
    emailSecTitle: "Email spoofing defense",
    emailSecStrong: "This domain is protected against email spoofing.",
    emailSecWeak: "No or weak DMARC — this domain can be spoofed in phishing. Add a DMARC record with p=reject.",
    emailSecUnavail: "Couldn't read DNS records.",
    stealerDomTitle: "Infostealer exposure",
    stealerDomDesc: "Credentials for this domain appear in infostealer logs — stolen from infected devices.",
    stealerDomNone: "This domain doesn't appear in infostealer logs.",
    stealerDomEmp: (n) => `${n.toLocaleString("en-US")} employee creds`,
    stealerDomUsr: (n) => `${n.toLocaleString("en-US")} user/customer creds`,
  },
  actors: {
    eyebrow: "APTs and crime groups",
    h1: "Who's targeting you?",
    leadPre: "Enter a country, sector, or company name — and we'll show which ",
    leadMid: "APT",
    leadEnd: " and crime groups target it. Every answer is tied to a source: we return only what the source openly states, no invented links.",
    consoleLabel: "actors --who <country | sector | name>",
    placeholder: "country · sector · group name",
    examples: "examples:",
    searching: "searching…",
    resultFor: (q) => `Result: “${q}”`,
    matchNote: "match_reasons = why it matched",
    empty: (q) => `No actor openly states “${q}” as a target. Actors that don't state it don't appear here — that's the product's honesty rule, no invented links.`,
    totalNote: (n, q) => `${n} actors openly state “${q}” as a target. Actors that don't state it don't appear here.`,
    leadingTitle: "Leading threat actors",
    leadingNote: "ranked by ATT&CK depth + activity",
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
    sourcesLine: (t, a, az, d) => `Sources: MISP Galaxy + ransomware.live + MITRE ATT&CK, recent activity name-joined with our items. Roster ${t} actors (${a} active, ${az} in Azerbaijani)${d ? ` · updated ${d}` : ""}. Search covers the whole roster.`,
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
    relatedLabel: "related groups · MISP",
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
};

const DICTS: Record<Locale, Dict> = { az, en };
export function getDict(locale: Locale): Dict {
  return DICTS[locale] ?? az;
}
