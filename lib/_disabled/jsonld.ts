// Shared schema.org helpers. Breadcrumbs are one of the cheapest SERP
// enhancements — every detail page already renders the visible trail.
const SITE = "https://skopnix.com";

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}
