export type EntryType = 'cost' | 'income';

export interface LineItem {
  id: string;
  date: string; // ISO yyyy-mm-dd
  category: string;
  description: string;
  amount: number; // always positive; sign implied by `type`
  type: EntryType;
  source: 'imported' | 'manual';
}

export interface FundEntry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  amount: number; // capital available (savings, investment, prior revenue already collected)
  description: string;
}

export type RevenueModelType = 'simple' | 'funnel';

export interface SimpleModelAssumptions {
  tier1Price: number;
  tier2Price: number;
  wholesalePrice: number;
  tier1SitesPerMonth: number;
  tier2SitesPerMonth: number;
  wholesaleSitesPerMonth: number;
  monthlyGrowthRatePct: number;
}

export type SaleMode = 'direct' | 'referral_commission';

export interface FunnelModelAssumptions {
  monthlyLeads: number;
  activePartnerships: number;
  conversionRatePct: number;
  saleMode: SaleMode;
  avgSalePrice: number;
  commissionRatePct: number;
  monthlyGrowthRatePct: number;
}

export interface RevenueAssumptions {
  activeModel: RevenueModelType;
  simple: SimpleModelAssumptions;
  funnel: FunnelModelAssumptions;
  projectionStartDate: string; // ISO yyyy-mm-dd, default = today
  costRunRateOverride: number | null; // null = auto trailing 3-month average
  targetBreakEvenDate: string; // ISO yyyy-mm-dd, default = today + 6 months
}

export interface MonthlyProjection {
  month: string; // yyyy-MM
  actualCost: number;
  actualIncome: number;
  projectedCost: number;
  projectedRevenue: number;
  netCashFlow: number;
  burnRate: number; // = -netCashFlow; positive means burning cash
  cumulativeFunds: number;
  cumulativeCosts: number;
  cumulativeRevenue: number;
  cumulativePosition: number; // cumulativeFunds + cumulativeRevenue - cumulativeCosts
  cumulativeNetProfit: number; // cumulativeRevenue - cumulativeCosts, EXCLUDING cumulativeFunds — P&L view, not cash position
  isBreakEven: boolean;
}

export type BreakEvenStatus = 'ahead' | 'on-track' | 'behind' | 'at-risk';

export interface BreakEvenResult {
  status: BreakEvenStatus;
  breakEvenMonth: string | null;
  targetMonth: string;
  monthsDelta: number | null; // negative = ahead, positive = behind, null if at-risk
}

export interface AppState {
  lineItems: LineItem[];
  fundEntries: FundEntry[];
  revenueAssumptions: RevenueAssumptions;
  schemaVersion: number;
}
