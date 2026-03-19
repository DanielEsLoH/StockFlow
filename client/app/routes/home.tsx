import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { requireGuest } from "~/lib/auth.server";
import {
  LandingHeader,
  HeroSection,
  SocialProofBar,
  ModuleShowcase,
  HowItWorks,
  DianCompliance,
  TestimonialsSection,
  PricingSection,
  IntegrationsSection,
  PWASection,
  FinalCTA,
  LandingFooter,
} from "~/components/landing";

const SITE_URL = "https://www.stockflow.com.co";
const TITLE = "StockFlow - Inventario, Facturación DIAN, POS, Contabilidad y Nómina";
const DESCRIPTION =
  "Plataforma integral para PYMEs colombianas. Inventario multi-bodega, facturación electrónica DIAN, punto de venta, contabilidad, nómina y más de 30 módulos integrados.";

export function meta() {
  return [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    // Canonical
    { tagName: "link", rel: "canonical", href: SITE_URL },
    // Open Graph
    { property: "og:type", content: "website" },
    { property: "og:url", content: SITE_URL },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:image", content: `${SITE_URL}/og-image.png` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:locale", content: "es_CO" },
    { property: "og:site_name", content: "StockFlow" },
    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: TITLE },
    { name: "twitter:description", content: DESCRIPTION },
    { name: "twitter:image", content: `${SITE_URL}/og-image.png` },
    // Additional SEO
    { name: "keywords", content: "inventario, facturación electrónica, DIAN, POS, punto de venta, contabilidad, nómina, software empresarial, PYMEs Colombia, ERP Colombia" },
    { name: "author", content: "StockFlow" },
    { name: "robots", content: "index, follow" },
  ];
}

// Redirect authenticated users to dashboard
export function loader({ request }: Route.LoaderArgs) {
  requireGuest(request);
  return null;
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Ensure landing always starts at the top
    window.scrollTo(0, 0);
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StockFlow",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: DESCRIPTION,
    url: SITE_URL,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "COP",
      lowPrice: "0",
      highPrice: "249900",
      offerCount: "4",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "500",
      bestRating: "5",
    },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader isMounted={isMounted} />
      <HeroSection isMounted={isMounted} />
      <SocialProofBar isMounted={isMounted} />
      <ModuleShowcase isMounted={isMounted} />
      <HowItWorks isMounted={isMounted} />
      <DianCompliance isMounted={isMounted} />
      <TestimonialsSection isMounted={isMounted} />
      <IntegrationsSection isMounted={isMounted} />
      <PWASection isMounted={isMounted} />
      <PricingSection
        isMounted={isMounted}
        isAnnual={isAnnual}
        setIsAnnual={setIsAnnual}
      />
      <FinalCTA isMounted={isMounted} />
      <LandingFooter />
    </div>
  );
}
