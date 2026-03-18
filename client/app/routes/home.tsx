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

export function meta() {
  return [
    { title: "StockFlow - Inventario, Facturación DIAN, POS, Contabilidad y Nómina" },
    {
      name: "description",
      content:
        "Plataforma integral para PYMEs colombianas. Inventario multi-bodega, facturación electrónica DIAN, punto de venta, contabilidad, nómina y más de 30 módulos integrados.",
    },
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

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
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
