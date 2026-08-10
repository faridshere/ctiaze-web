import type { Locale } from "./i18n";

// The product: a breach dump is noise until it tells you WHAT TO DO. This maps the
// exposed data-classes (from XposedOrNot / HIBP / LeakCheck) and the infostealer
// signal (Hudson Rock) to a risk level and a concrete, plain-Azerbaijani action.
// Pure code, no cost. Ordered most-severe first; duplicate advice is merged.

export type Risk = "critical" | "high" | "medium" | "low";
export const RISK_ORDER: Record<Risk, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function riskLabel(risk: Risk, locale: Locale): string {
  const az: Record<Risk, string> = { critical: "kritik", high: "yüksək", medium: "orta", low: "aşağı" };
  const en: Record<Risk, string> = { critical: "critical", high: "high", medium: "medium", low: "low" };
  return (locale === "en" ? en : az)[risk];
}

export type ActionItem = { risk: Risk; az: string; en: string };

// First matching rule wins, so put the sharpest (card, token) before the generic.
const RULES: { match: RegExp; risk: Risk; az: string; en: string }[] = [
  {
    match: /password|şifr|parol/,
    risk: "critical",
    az: "Bu parolu işlətdiyin BÜTÜN hesablarda dərhal dəyiş və hər yerdə 2FA aktiv et. Eyni parolu təkrar istifadə etmə.",
    en: "Change this password on EVERY account that uses it and turn on 2FA everywhere. Never reuse it.",
  },
  {
    match: /credit card|card number|cvv|card detail|bank account|account balance|financial|iban|payment/,
    risk: "critical",
    az: "Bankına zəng et, kartı blokla və son əməliyyatları yoxla. Kart məlumatın oğurlanıb.",
    en: "Call your bank, freeze the card, and review recent transactions — your card data is exposed.",
  },
  {
    match: /auth token|session|cookie|access token|refresh token|api key/,
    risk: "critical",
    az: "Sessiyalar ələ keçirilə bilər — bütün cihazlarda çıxış et, yenidən daxil ol və API açarlarını yenilə.",
    en: "Sessions can be hijacked — sign out of all devices, sign back in, and rotate any API keys.",
  },
  {
    match: /crypto|wallet|seed phrase|private key|mnemonic/,
    risk: "critical",
    az: "Kripto aktivlərini dərhal yeni wallet-ə köçür; sızmış seed phrase-i heç vaxt təkrar işlətmə.",
    en: "Move crypto to a fresh wallet now; never reuse a leaked seed phrase.",
  },
  {
    match: /social security|passport|national id|government|tax file|driver|voter/,
    risk: "critical",
    az: "Şəxsiyyət oğurluğu riski — sənəd nömrəsinin sui-istifadəsini izlə, mümkünsə yenilə, kredit müraciətlərinə diqqət et.",
    en: "Identity-theft risk — watch for misuse of the ID number, replace it if possible, monitor for fraudulent credit applications.",
  },
  {
    match: /biometric/,
    risk: "critical",
    az: "Biometrik məlumat dəyişdirilə bilmir — onu tək faktor kimi işlətmə, digər təhlükəsizlik faktorlarını gücləndir.",
    en: "Biometrics can't be changed — don't rely on them as a sole factor; strengthen your other factors.",
  },
  {
    match: /security question/,
    risk: "high",
    az: "Təhlükəsizlik suallarını və cavablarını bütün hesablarda dəyiş — cavablar da parol qədər həssasdır.",
    en: "Change your security questions and answers everywhere — the answers are as sensitive as a password.",
  },
  {
    match: /private message|chat|\bdm\b|message content/,
    risk: "high",
    az: "Şəxsi yazışmaların açıla bilər — həssas məlumat paylaşdığın söhbətləri nəzərdən keçir.",
    en: "Private messages may be exposed — review conversations where you shared sensitive information.",
  },
  {
    match: /phone|mobile|msisdn/,
    risk: "medium",
    az: "SIM-swap və smishing riski — operatorunda SIM qorumasını aktiv et, naməlum SMS linklərinə toxunma.",
    en: "SIM-swap and smishing risk — enable a SIM-lock with your carrier and don't tap links in unknown texts.",
  },
  {
    match: /physical address|home address|address|geo|location/,
    risk: "medium",
    az: "Ünvan/məkan məlumatın açıqdır — doxxing və hədəfli fişinqə qarşı ayıq ol, real-time yer paylaşımını məhdudlaşdır.",
    en: "Address/location data is exposed — stay alert to doxxing and targeted phishing; limit real-time location sharing.",
  },
  {
    match: /date of birth|\bdob\b|birth/,
    risk: "medium",
    az: "Doğum tarixi kimlik təsdiqində işlənir — bank və dövlət xidmətlərində əlavə yoxlama (step-up) aktiv et.",
    en: "Date of birth is used for identity verification — enable extra (step-up) verification on bank and government services.",
  },
  {
    match: /email/,
    risk: "medium",
    az: "Bu ünvan hədəfli fişinq və credential-stuffing üçün açıqdır — gözlənilməz məktublara ehtiyatla yanaş.",
    en: "This address is exposed to targeted phishing and credential stuffing — treat unexpected emails with caution.",
  },
  {
    match: /username|\bname\b|full name|gender|ip address|device|browser|user agent|social media|profile/,
    risk: "low",
    az: "Profil məlumatların fişinqi şəxsiləşdirmək üçün işlənə bilər — səni tanıyan «rəsmi» mesajlara şübhə ilə yanaş.",
    en: "Profile data can be used to personalize phishing — be skeptical of “official” messages that know your details.",
  },
];

// The infostealer verdict is its own, most-severe action: the device itself was
// compromised, so every stored secret is gone — not just the fields a breach leaked.
const INFOSTEALER: ActionItem = {
  risk: "critical",
  az: "Cihazın info-stealer ilə yoluxub: brauzerdə saxlanan BÜTÜN parollar, cookie və token-lər oğurlanıb. TƏMİZ cihazdan bütün parolları dəyiş, sessiyaları ləğv et, cihazı tam antivirus yoxlamasından keçir və mümkünsə OS-u yenidən qur.",
  en: "Your device was infostealer-infected: EVERY saved password, cookie and token was stolen. From a CLEAN device, change all passwords, revoke sessions, run a full AV scan, and reinstall the OS if you can.",
};

export function breachActions(
  exposedData: string[],
  opts: { passwordsExposed?: boolean; infostealer?: boolean },
  locale: Locale
): ActionItem[] {
  const items: ActionItem[] = [];
  const seen = new Set<string>();
  const add = (it: ActionItem) => {
    const key = locale === "en" ? it.en : it.az;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(it);
  };

  if (opts.infostealer) add(INFOSTEALER);
  if (opts.passwordsExposed) add(RULES[0]); // the password rule, even if not listed as a class
  for (const cls of exposedData) {
    const rule = RULES.find((r) => r.match.test(cls.toLowerCase()));
    if (rule) add(rule);
  }

  items.sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk]);
  return items;
}
