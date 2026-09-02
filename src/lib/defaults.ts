import { addMonths, format } from 'date-fns';
import type { RevenueAssumptions } from '../types/domain';

const todayISO = () => format(new Date(), 'yyyy-MM-dd');

// Seed values from matrimoni.top's own pricing/dossier:
// Tier 1 (automated, ready in 48h) €150-250, Tier 2 (fully custom) €400-800,
// B2B wholesale ~€100, referral commission 10-15%, pilot batch of 5-12 active partnerships.
export function defaultRevenueAssumptions(): RevenueAssumptions {
  const today = new Date();
  return {
    activeModel: 'simple',
    simple: {
      tier1Price: 200,
      tier2Price: 600,
      wholesalePrice: 100,
      tier1SitesPerMonth: 3,
      tier2SitesPerMonth: 1,
      wholesaleSitesPerMonth: 2,
      monthlyGrowthRatePct: 5,
    },
    funnel: {
      monthlyLeads: 20,
      activePartnerships: 8,
      conversionRatePct: 15,
      saleMode: 'referral_commission',
      avgSalePrice: 200,
      commissionRatePct: 12.5,
      monthlyGrowthRatePct: 8,
    },
    projectionStartDate: todayISO(),
    costRunRateOverride: null,
    targetBreakEvenDate: format(addMonths(today, 6), 'yyyy-MM-dd'),
  };
}
