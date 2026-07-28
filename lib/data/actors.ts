// Curated threat-actor knowledge base. Facts are drawn from public attribution
// (MITRE ATT&CK, vendor reporting) and kept to well-established groups. Each
// entry links to its MITRE ATT&CK Group page where one exists. `knownFor` is
// written in Azerbaijani (with the usual English security terms) to match the
// site register. Aliases drive detection in story text — keep them distinctive.

export type ActorType = "state" | "ransomware" | "cybercrime" | "hacktivist";

export type Actor = {
  id: string;
  name: string;
  aliases: string[];
  type: ActorType;
  country?: string; // attribution
  flag?: string; // emoji
  mitre?: string; // MITRE ATT&CK group id (Gxxxx)
  knownFor: string; // AZ: notoriety + what they've done
  // Ambiguous common-word names (Play, Royal, Maze…) only match when the story
  // also carries threat context, to avoid false positives.
  requiresContext?: boolean;
};

// The pivot term to hand the live-IOC feed (TweetFeed tags use these forms).
export type MalwareFamily = { name: string; aliases: string[] };

export const ACTORS: Actor[] = [
  // ── Russia ────────────────────────────────────────────────────────────
  {
    id: "apt28", name: "APT28", type: "state", country: "Rusiya", flag: "🇷🇺",
    mitre: "G0007",
    aliases: ["APT28", "Fancy Bear", "Sofacy", "Sednit", "Pawn Storm", "STRONTIUM", "Forest Blizzard", "Fighting Ursa", "Unit 26165"],
    knownFor:
      "Rusiya hərbi kəşfiyyatının (GRU, 26165 bölməsi) APT qrupu. 2016 DNC sızması, WADA və Bundestag hücumları, NATO ölkələrinə qarşı spear-phishing və 0-day kampaniyaları ilə tanınır.",
  },
  {
    id: "apt29", name: "APT29", type: "state", country: "Rusiya", flag: "🇷🇺",
    mitre: "G0016",
    aliases: ["APT29", "Cozy Bear", "The Dukes", "Midnight Blizzard", "Nobelium", "Cloaked Ursa", "UNC2452"],
    knownFor:
      "Rusiya xarici kəşfiyyatının (SVR) qrupu. 2020 SolarWinds supply-chain hücumunun və Microsoft/HPE korporativ e-poçt sızmalarının arxasında dayanır; gizli, uzunmüddətli casusluğa fokuslanır.",
  },
  {
    id: "sandworm", name: "Sandworm", type: "state", country: "Rusiya", flag: "🇷🇺",
    mitre: "G0034",
    aliases: ["Sandworm", "Voodoo Bear", "Seashell Blizzard", "Telebots", "Unit 74455", "APT44"],
    knownFor:
      "GRU-nun 74455 bölməsi — tarixin ən dağıdıcı dövlət hücumları ilə tanınır: 2015/2016 Ukrayna enerji şəbəkəsinin söndürülməsi, 2017 NotPetya (10+ mlrd $ ziyan) və Olimpiya oyunlarına qarşı Olympic Destroyer.",
  },
  {
    id: "turla", name: "Turla", type: "state", country: "Rusiya", flag: "🇷🇺",
    mitre: "G0010",
    aliases: ["Turla", "Snake", "Venomous Bear", "Waterbug", "Uroburos", "Secret Blizzard"],
    knownFor:
      "FSB-yə aid edilən, texniki cəhətdən ən mürəkkəb casusluq qruplarından biri. Snake/Uroburos rootkit-i, peyk internet trafikinin oğurlanması və hökumət/diplomatik hədəflərə onilliklərlə casusluqla tanınır.",
  },
  {
    id: "gamaredon", name: "Gamaredon", type: "state", country: "Rusiya", flag: "🇷🇺",
    mitre: "G0047",
    aliases: ["Gamaredon", "Primitive Bear", "Armageddon", "Shuckworm", "Aqua Blizzard"],
    knownFor:
      "FSB-yə bağlı, əsasən Ukraynaya qarşı yüksək tezlikli spear-phishing kampaniyaları aparan qrup — kütləvi, davamlı casusluq əməliyyatları ilə tanınır.",
  },
  // ── North Korea ───────────────────────────────────────────────────────
  {
    id: "lazarus", name: "Lazarus Group", type: "state", country: "Şimali Koreya", flag: "🇰🇵",
    mitre: "G0032",
    aliases: ["Lazarus", "Hidden Cobra", "Zinc", "Diamond Sleet", "Labyrinth Chollima", "Guardians of Peace"],
    knownFor:
      "Şimali Koreya rejiminin əsas hücum qrupu. 2014 Sony Pictures sızması, 2016 Banqladeş Mərkəzi Bankından 81 mln $ SWIFT oğurluğu, 2017 WannaCry və milyardlarla dollarlıq kripto oğurluqları ilə tanınır.",
  },
  {
    id: "apt38", name: "APT38", type: "state", country: "Şimali Koreya", flag: "🇰🇵",
    mitre: "G0082",
    aliases: ["APT38", "BlueNoroff", "Stardust Chollima", "Sapphire Sleet"],
    knownFor:
      "Lazarus çətiri altında maliyyə oğurluğuna ixtisaslaşan bölmə — banklara, SWIFT sisteminə və kripto birjalarına qarşı milyard dollarlıq soyğunları ilə tanınır.",
  },
  {
    id: "kimsuky", name: "Kimsuky", type: "state", country: "Şimali Koreya", flag: "🇰🇵",
    mitre: "G0094",
    aliases: ["Kimsuky", "Velvet Chollima", "Thallium", "Emerald Sleet", "APT43"],
    knownFor:
      "Şimali Koreyanın casusluq qrupu — think-tank, akademik, jurnalist və hökumət ekspertlərinə qarşı sosial mühəndislik və e-poçt kompromisi ilə strateji kəşfiyyat toplayır.",
  },
  {
    id: "andariel", name: "Andariel", type: "state", country: "Şimali Koreya", flag: "🇰🇵",
    mitre: "G0138",
    aliases: ["Andariel", "Onyx Sleet", "Silent Chollima", "Stonefly"],
    knownFor:
      "Lazarus-a bağlı, son illərdə casusluqla yanaşı ransomware-ə keçən qrup — müdafiə, aerokosmik və səhiyyə sektorlarını hədəfləyir.",
  },
  // ── China ─────────────────────────────────────────────────────────────
  {
    id: "apt41", name: "APT41", type: "state", country: "Çin", flag: "🇨🇳",
    mitre: "G0096",
    aliases: ["APT41", "Winnti", "Barium", "Wicked Panda", "Brass Typhoon", "Double Dragon"],
    knownFor:
      "Həm dövlət casusluğu, həm də şəxsi maliyyə məqsədi güdən nadir qrup. Supply-chain hücumları, video-oyun sənayesinə soxulma və geniş miqyaslı korporativ casusluqla tanınır.",
  },
  {
    id: "apt10", name: "APT10", type: "state", country: "Çin", flag: "🇨🇳",
    mitre: "G0045",
    aliases: ["APT10", "Stone Panda", "menuPass", "Cicada", "Potassium"],
    knownFor:
      "Çin Dövlət Təhlükəsizlik Nazirliyinə bağlı qrup — 'Cloud Hopper' kampaniyasında managed service provider-lər vasitəsilə onlarla ölkədə korporativ İP-ni oğurlamağı ilə tanınır.",
  },
  {
    id: "mustangpanda", name: "Mustang Panda", type: "state", country: "Çin", flag: "🇨🇳",
    mitre: "G0129",
    aliases: ["Mustang Panda", "Bronze President", "Earth Preta", "Stately Taurus", "RedDelta"],
    knownFor:
      "Çin casusluq qrupu — PlugX malware və USB yayılması ilə hökumət, QHT və diaspora icmalarına, xüsusən Cənub-Şərqi Asiya və Avropada casusluqla tanınır.",
  },
  {
    id: "volttyphoon", name: "Volt Typhoon", type: "state", country: "Çin", flag: "🇨🇳",
    mitre: "G1017",
    aliases: ["Volt Typhoon", "Vanguard Panda", "Bronze Silhouette"],
    knownFor:
      "Kritik infrastrukturda (enerji, su, kommunikasiya) gizli mövqe tutan qrup — 'living-off-the-land' texnikaları ilə aşkarlanmadan qalıb münaqişə anında sabotaj imkanı yaratmağı ilə tanınır.",
  },
  {
    id: "salttyphoon", name: "Salt Typhoon", type: "state", country: "Çin", flag: "🇨🇳",
    aliases: ["Salt Typhoon", "GhostEmperor", "FamousSparrow", "Earth Estries"],
    knownFor:
      "2024-cü ildə ABŞ telekom operatorlarına (AT&T, Verizon) genişmiqyaslı soxulması və qanuni telefon dinləmə sistemlərinə çıxış əldə etməsi ilə tanınan Çin casusluq qrupu.",
  },
  // ── Iran ──────────────────────────────────────────────────────────────
  {
    id: "apt35", name: "APT35 (Charming Kitten)", type: "state", country: "İran", flag: "🇮🇷",
    mitre: "G0059",
    aliases: ["APT35", "Charming Kitten", "Phosphorus", "Mint Sandstorm", "TA453", "Magic Hound"],
    knownFor:
      "İran Sepahına (IRGC) bağlı qrup — jurnalist, akademik və siyasi fiqurlara qarşı incə sosial mühəndislik və credential phishing kampaniyaları ilə tanınır.",
  },
  {
    id: "apt34", name: "APT34 (OilRig)", type: "state", country: "İran", flag: "🇮🇷",
    mitre: "G0049",
    aliases: ["APT34", "OilRig", "Helix Kitten", "Hazel Sandstorm", "Cobalt Gypsy", "Earth Simnavaz"],
    knownFor:
      "İran kəşfiyyatının qrupu — Yaxın Şərqdə enerji, maliyyə və hökumət sektorlarına DNS tunneling və supply-chain hücumları ilə casusluqla tanınır.",
  },
  {
    id: "muddywater", name: "MuddyWater", type: "state", country: "İran", flag: "🇮🇷",
    mitre: "G0069",
    aliases: ["MuddyWater", "Static Kitten", "Mercury", "Mango Sandstorm", "Seedworm", "Earth Vetala"],
    knownFor:
      "İran Kəşfiyyat Nazirliyinə (MOIS) aid edilən qrup — telekom, hökumət və neft-qaz hədəflərinə qarşı legitim uzaqdan idarəetmə alətlərindən (RMM) istifadə ilə tanınır.",
  },
  {
    id: "apt33", name: "APT33", type: "state", country: "İran", flag: "🇮🇷",
    mitre: "G0064",
    aliases: ["APT33", "Elfin", "Refined Kitten", "Peach Sandstorm", "Holmium"],
    knownFor:
      "İranla bağlı qrup — aerokosmik və enerji sektorlarını hədəfləyir; Shamoon kimi dağıdıcı 'wiper' malware ilə əlaqələndirilir.",
  },
  // ── Financially-motivated / cybercrime ───────────────────────────────
  {
    id: "fin7", name: "FIN7", type: "cybercrime", flag: "💵",
    mitre: "G0046",
    aliases: ["FIN7", "Carbanak", "Carbon Spider", "Sangria Tempest", "Cobalt Group"],
    knownFor:
      "Milyard dollarlıq maliyyə cinayət qrupu — pərakəndə və restoran sektorlarından milyonlarla ödəniş kartını oğurlaması, sonradan ransomware əməliyyatlarına keçməsi ilə tanınır.",
  },
  {
    id: "scatteredspider", name: "Scattered Spider", type: "cybercrime", flag: "🕷️",
    mitre: "G1015",
    aliases: ["Scattered Spider", "Octo Tempest", "UNC3944", "Muddled Libra", "Scatter Swine", "0ktapus"],
    knownFor:
      "İngilisdilli gənc hakerlərdən ibarət qrup — help-desk-i aldadaraq MFA-nı keçməsi, SIM-swap və 2023 MGM/Caesars kazino hücumları ilə tanınır; ALPHV və RansomHub ilə əməkdaşlıq edir.",
  },
  {
    id: "ta505", name: "TA505", type: "cybercrime", flag: "💵",
    mitre: "G0092",
    aliases: ["TA505", "Hive0065", "Graceful Spider", "Evil Corp"],
    knownFor:
      "Dünyanın ən böyük malware yayıcı qruplarından biri — Dridex bankçılıq troyanı, Locky ransomware və Cl0p əməliyyatları ilə əlaqələndirilir.",
  },
  // ── Ransomware / RaaS ─────────────────────────────────────────────────
  {
    id: "lockbit", name: "LockBit", type: "ransomware", flag: "🔒",
    aliases: ["LockBit", "LockBit 3.0", "Bitwise Spider"],
    knownFor:
      "Uzun müddət dünyanın ən aktiv ransomware-as-a-service (RaaS) əməliyyatı — minlərlə qurban. 2024-cü ildə beynəlxalq 'Operation Cronos' ilə infrastrukturu qismən dağıdılsa da yenidən fəallaşmağa cəhd etdi.",
  },
  {
    id: "alphv", name: "ALPHV / BlackCat", type: "ransomware", flag: "🔒",
    aliases: ["ALPHV", "BlackCat", "Noberus"],
    knownFor:
      "Rust dilində yazılmış ilk böyük ransomware — Change Healthcare hücumu (ABŞ səhiyyəsini iflic etdi) ilə tanınır; 2024-cü ildə 'exit scam' edərək filialını aldatdı.",
  },
  {
    id: "clop", name: "Cl0p", type: "ransomware", flag: "🔒",
    aliases: ["Cl0p", "Clop", "TA505 ransomware", "Lace Tempest"],
    knownFor:
      "Kütləvi supply-chain zəiflik istismarı ilə tanınır — MOVEit Transfer, GoAnywhere və Accellion 0-day-ləri ilə eyni anda minlərlə təşkilatdan məlumat oğurlaması.",
  },
  {
    id: "conti", name: "Conti", type: "ransomware", flag: "🔒",
    aliases: ["Conti", "Wizard Spider"],
    knownFor:
      "Ən çox gəlir gətirmiş ransomware əməliyyatlarından biri — Kosta-Rika hökumətini fövqəladə vəziyyətə salması ilə tanınır; 2022-də daxili yazışmaları sızdırıldıqdan sonra dağıldı və törəmə qruplara bölündü.",
  },
  {
    id: "blackbasta", name: "Black Basta", type: "ransomware", flag: "🔒",
    aliases: ["Black Basta", "BlackBasta"],
    knownFor:
      "Conti-nin varisi sayılan RaaS — Qakbot və sosial mühəndisliklə (Teams/e-poçt bombalama) ilkin çıxış əldə etməsi ilə tanınır.",
  },
  {
    id: "ransomhub", name: "RansomHub", type: "ransomware", flag: "🔒",
    aliases: ["RansomHub"],
    knownFor:
      "2024-cü ildə sürətlə ən aktiv RaaS-lərdən birinə çevrilən qrup — ALPHV və LockBit-in dağılmasından sonra filiallarını cəlb etdi.",
  },
  {
    id: "akira", name: "Akira", type: "ransomware", flag: "🔒", requiresContext: true,
    aliases: ["Akira"],
    knownFor:
      "2023-dən bəri aktiv, retro estetikalı ransomware — əsasən VPN zəiflikləri və MFA olmayan hesablar vasitəsilə KOB-ları hədəfləyir.",
  },
  {
    id: "play", name: "Play", type: "ransomware", flag: "🔒", requiresContext: true,
    aliases: ["PlayCrypt", "Play ransomware", "Balloonfly"],
    knownFor:
      "Kritik infrastruktur və hökumət qurumlarını hədəfləyən ransomware — FBI/CISA xəbərdarlıqlarına səbəb olmuşdur.",
  },
  {
    id: "medusa", name: "Medusa", type: "ransomware", flag: "🔒", requiresContext: true,
    aliases: ["Medusa ransomware", "MedusaLocker"],
    knownFor:
      "Səhiyyə, təhsil və dövlət sektorlarını hədəfləyən, 'triple extortion' taktikası ilə tanınan RaaS.",
  },
  {
    id: "rhysida", name: "Rhysida", type: "ransomware", flag: "🔒",
    aliases: ["Rhysida"],
    knownFor:
      "Səhiyyə və dövlət qurumlarına hücumları ilə tanınan ransomware — British Library hücumu ən məşhur qurbanlarındandır.",
  },
  {
    id: "qilin", name: "Qilin", type: "ransomware", flag: "🔒",
    aliases: ["Qilin", "Agenda ransomware"],
    knownFor:
      "2024-cü ildə Londonun Synnovis laboratoriyasına hücumla NHS xəstəxanalarında əməliyyatların ləğvinə səbəb olan RaaS.",
  },
  {
    id: "revil", name: "REvil", type: "ransomware", flag: "🔒",
    aliases: ["REvil", "Sodinokibi", "Pinchy Spider"],
    knownFor:
      "2021 Kaseya supply-chain və JBS ət istehsalçısı hücumları ilə tanınan RaaS — sonradan Rusiyada həbslərlə dağıdıldı.",
  },
  // ── Hacktivist / DDoS ────────────────────────────────────────────────
  {
    id: "noname057", name: "NoName057(16)", type: "hacktivist", flag: "🇷🇺",
    aliases: ["NoName057", "NoName057(16)"],
    knownFor:
      "Rusiya yönümlü hacktivist qrup — Ukraynanı dəstəkləyən ölkələrin hökumət və maliyyə saytlarına davamlı DDoS hücumları (DDoSia layihəsi) ilə tanınır.",
  },
  {
    id: "killnet", name: "Killnet", type: "hacktivist", flag: "🇷🇺",
    aliases: ["Killnet"],
    knownFor:
      "Pro-Rusiya hacktivist kollektivi — NATO ölkələrinin hökumət, hava limanı və səhiyyə saytlarına siyasi motivli DDoS kampaniyaları ilə tanınır.",
  },
  {
    id: "anonymoussudan", name: "Anonymous Sudan", type: "hacktivist", flag: "🏴",
    aliases: ["Anonymous Sudan", "Storm-1359"],
    knownFor:
      "Böyük texnoloji platformalara (Microsoft, OpenAI, X) güclü DDoS hücumları ilə tanınan qrup — 2024-cü ildə operatorları ABŞ tərəfindən ittiham olundu.",
  },
];

// Malware / tool families used as live-enrichment pivots. Names match the tags
// TweetFeed / ThreatFox use.
export const MALWARE_FAMILIES: MalwareFamily[] = [
  { name: "LockBit", aliases: ["LockBit"] },
  { name: "BlackCat", aliases: ["ALPHV", "BlackCat"] },
  { name: "Cl0p", aliases: ["Cl0p", "Clop"] },
  { name: "BlackBasta", aliases: ["Black Basta", "BlackBasta"] },
  { name: "RansomHub", aliases: ["RansomHub"] },
  { name: "Akira", aliases: ["Akira"] },
  { name: "Medusa", aliases: ["Medusa"] },
  { name: "Qilin", aliases: ["Qilin", "Agenda"] },
  { name: "CobaltStrike", aliases: ["Cobalt Strike", "CobaltStrike"] },
  { name: "Emotet", aliases: ["Emotet"] },
  { name: "Qakbot", aliases: ["Qakbot", "Qbot"] },
  { name: "TrickBot", aliases: ["TrickBot"] },
  { name: "IcedID", aliases: ["IcedID"] },
  { name: "AsyncRAT", aliases: ["AsyncRAT"] },
  { name: "NjRAT", aliases: ["njRAT", "Bladabindi"] },
  { name: "Remcos", aliases: ["Remcos"] },
  { name: "AgentTesla", aliases: ["Agent Tesla", "AgentTesla"] },
  { name: "Formbook", aliases: ["Formbook", "XLoader"] },
  { name: "RedLine", aliases: ["RedLine"] },
  { name: "Lumma", aliases: ["Lumma", "LummaStealer", "LummaC2"] },
  { name: "Vidar", aliases: ["Vidar"] },
  { name: "Amadey", aliases: ["Amadey"] },
  { name: "SmokeLoader", aliases: ["SmokeLoader"] },
  { name: "DarkGate", aliases: ["DarkGate"] },
  { name: "PikaBot", aliases: ["PikaBot"] },
  { name: "Bumblebee", aliases: ["Bumblebee"] },
  { name: "PlugX", aliases: ["PlugX"] },
  { name: "Sliver", aliases: ["Sliver"] },
  { name: "WannaCry", aliases: ["WannaCry"] },
  { name: "Snake", aliases: ["Snake malware", "Uroburos"] },
];
