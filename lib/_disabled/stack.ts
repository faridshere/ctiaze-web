import type { Story } from "../types";

// "Mənim stekim" — the reader's own tech stack. Answers the SOC/IT question the
// AZ filter can't ("is anything today about MY FortiGate / Exchange / MikroTik?"),
// entirely client-side (localStorage, no accounts, $0). Matching is deterministic
// word-boundary over the story text — same no-false-positive discipline as the
// engine's cti/footprint.py product regexes, so a match is real, never inferred.

export type StackProduct = { id: string; label: string; re: RegExp };

// Curated, distinctive, high-CTI-relevance products. Each regex is specific enough
// to avoid everyday-word collisions (e.g. "OWA"/"Exchange server", never bare
// "exchange"). Order groups by kind (edge/VPN, mail, virtualization, dev, storage).
export const STACK_PRODUCTS: StackProduct[] = [
  { id: "fortigate", label: "FortiGate / FortiOS", re: /\bfortigate\b|\bfortios\b|\bfortinet\b/i },
  { id: "globalprotect", label: "Palo Alto / GlobalProtect", re: /\bglobalprotect\b|\bpan-os\b|\bpalo alto\b/i },
  { id: "netscaler", label: "Citrix NetScaler / ADC", re: /\bnetscaler\b|\bcitrix\b|\bcitrixbleed\b/i },
  { id: "ivanti", label: "Ivanti Connect Secure", re: /\bivanti\b|\bpulse secure\b|\bconnect secure\b/i },
  { id: "sonicwall", label: "SonicWall", re: /\bsonicwall\b/i },
  { id: "cisco", label: "Cisco (IOS / ASA)", re: /\bcisco\b/i },
  { id: "mikrotik", label: "MikroTik RouterOS", re: /\bmikrotik\b|\brouteros\b/i },
  { id: "zyxel", label: "Zyxel", re: /\bzyxel\b/i },
  { id: "exchange", label: "Microsoft Exchange / OWA", re: /\bmicrosoft exchange\b|\bexchange server\b|\bowa\b|\boutlook web\b/i },
  { id: "zimbra", label: "Zimbra / Roundcube", re: /\bzimbra\b|\broundcube\b/i },
  { id: "sharepoint", label: "SharePoint", re: /\bsharepoint\b/i },
  { id: "windows", label: "Windows Server / AD", re: /\bwindows server\b|\bactive directory\b/i },
  { id: "esxi", label: "VMware ESXi / vCenter", re: /\besxi\b|\bvcenter\b|\bvmware\b/i },
  { id: "veeam", label: "Veeam", re: /\bveeam\b/i },
  { id: "confluence", label: "Atlassian Confluence / Jira", re: /\bconfluence\b|\bjira\b|\batlassian\b/i },
  { id: "gitlab", label: "GitLab", re: /\bgitlab\b/i },
  { id: "jenkins", label: "Jenkins", re: /\bjenkins\b/i },
  { id: "wordpress", label: "WordPress", re: /\bwordpress\b|\bwoocommerce\b/i },
  { id: "apache", label: "Apache / Tomcat / Struts", re: /\bapache\b|\btomcat\b|\bstruts\b|\blog4j\b/i },
  { id: "manageengine", label: "Zoho ManageEngine", re: /\bmanageengine\b|\bzoho\b/i },
  { id: "moveit", label: "MOVEit / file transfer", re: /\bmoveit\b|\bgoanywhere\b|\bcleo\b/i },
  { id: "qnap", label: "QNAP / Synology (NAS)", re: /\bqnap\b|\bsynology\b/i },
];

const BY_ID = new Map(STACK_PRODUCTS.map((p) => [p.id, p]));

export function productLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

// The product ids a story mentions (word-boundary over its AZ + EN text).
export function storyStack(story: Story): string[] {
  const text = `${story.titleAz} ${story.titleEn} ${story.bodyAz} ${story.summaryEn}`;
  return STACK_PRODUCTS.filter((p) => p.re.test(text)).map((p) => p.id);
}
