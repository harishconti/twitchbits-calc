import { SITE } from "./site";

export function buildWebAppSchema(name: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
    url: SITE.url,
  };
}

export function buildFaqSchema(faqs: { q: string; a: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function buildBreadcrumbSchema(
  crumbs: { name: string; url: string }[],
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function buildOrganizationSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
  };
}

export function buildWebSiteSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
