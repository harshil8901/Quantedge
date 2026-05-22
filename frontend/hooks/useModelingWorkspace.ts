'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  convertWithRates,
  defaultCompanyProfile,
  defaultModelingPreferences,
  loadModelDraft,
  saveModelDraft,
  type CompanyProfile,
  type CurrencyCode,
  type DataInputMode,
  type ModelingPreferences,
  type UnitScale,
} from '@/lib/financial-modeling';

import { apiJson } from '@/lib/api-client';

type Draft = {
  company: CompanyProfile;
  preferences: ModelingPreferences;
  tickerQuery: string;
};

export function useModelingWorkspace(modelKey: string, initialCompany?: Partial<CompanyProfile>) {
  const draft = typeof window !== 'undefined' ? loadModelDraft<Draft>(modelKey) : null;

  const [tickerQuery, setTickerQuery] = useState(draft?.tickerQuery ?? initialCompany?.ticker ?? '');
  const [company, setCompany] = useState<CompanyProfile>(() => ({
    ...defaultCompanyProfile(),
    ...initialCompany,
    ...draft?.company,
  }));
  const [preferences, setPreferences] = useState<ModelingPreferences>(() => ({
    ...defaultModelingPreferences(),
    ...draft?.preferences,
  }));
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState<string | null>(null);

  const persist = useCallback(() => {
    saveModelDraft(modelKey, { company, preferences, tickerQuery });
  }, [modelKey, company, preferences, tickerQuery]);

  useEffect(() => {
    const timer = window.setTimeout(persist, 600);
    return () => window.clearTimeout(timer);
  }, [persist]);

  const refreshFxRates = useCallback(async (base?: CurrencyCode) => {
    const baseCurrency = base ?? preferences.baseCurrency;
    setFxLoading(true);
    setFxError(null);
    try {
      const data = await apiJson<{ rates?: Record<string, number> }>(`/api/fx/rates?base=${baseCurrency}`);
      setPreferences((prev) => ({
        ...prev,
        baseCurrency,
        fxRates: data.rates ?? { USD: 1 },
        useLiveFx: true,
      }));
    } catch (error) {
      setFxError(error instanceof Error ? error.message : 'FX load failed');
    } finally {
      setFxLoading(false);
    }
  }, [preferences.baseCurrency]);

  useEffect(() => {
    if (preferences.useLiveFx && Object.keys(preferences.fxRates).length <= 1) {
      refreshFxRates();
    }
  }, [preferences.useLiveFx, preferences.fxRates, refreshFxRates]);

  const setInputMode = (inputMode: DataInputMode) => {
    setPreferences((prev) => ({ ...prev, inputMode }));
  };

  const setBaseCurrency = (baseCurrency: CurrencyCode) => {
    setPreferences((prev) => ({ ...prev, baseCurrency }));
    refreshFxRates(baseCurrency);
  };

  const setCompanyCurrency = (companyCurrency: CurrencyCode) => {
    setCompany((prev) => ({ ...prev, currency: companyCurrency }));
    setPreferences((prev) => ({ ...prev, companyCurrency }));
  };

  const setDisplayUnit = (displayUnit: UnitScale) => {
    setPreferences((prev) => ({ ...prev, displayUnit }));
  };

  const setFxOverride = (pair: string, rate: number | undefined) => {
    setPreferences((prev) => {
      const fxOverrides = { ...prev.fxOverrides };
      if (rate == null || rate <= 0) delete fxOverrides[pair];
      else fxOverrides[pair] = rate;
      return { ...prev, fxOverrides, useLiveFx: false };
    });
  };

  const convertToBase = useCallback(
    (amount: number, from: CurrencyCode = company.currency) => {
      const pairKey = `${from}_${preferences.baseCurrency}`;
      const manual = preferences.fxOverrides[pairKey];
      return convertWithRates(amount, from, preferences.baseCurrency, preferences.fxRates, manual);
    },
    [company.currency, preferences],
  );

  const updateCompanyField = <K extends keyof CompanyProfile>(field: K, value: CompanyProfile[K]) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
    if (preferences.inputMode === 'api') {
      setPreferences((prev) => ({ ...prev, inputMode: 'hybrid' }));
    }
  };

  const applyApiCompany = (data: Record<string, unknown>) => {
    setCompany((prev) => ({
      ...mapApiMerge(data, prev),
      currency: (data.currency as CompanyProfile['currency']) || prev.currency || preferences.companyCurrency,
      industry: String(data.industry ?? prev.industry),
      region: String(data.region ?? data.country ?? prev.region),
      companyName: String(data.companyName ?? data.name ?? prev.companyName),
      ticker: String(data.ticker ?? data.symbol ?? prev.ticker),
    }));
    setPreferences((prev) => ({
      ...prev,
      inputMode: 'hybrid',
    }));
  };

  const fieldsLocked = preferences.inputMode === 'api';

  return {
    tickerQuery,
    setTickerQuery,
    company,
    setCompany,
    preferences,
    setPreferences,
    fxLoading,
    fxError,
    refreshFxRates,
    setInputMode,
    setBaseCurrency,
    setCompanyCurrency,
    setDisplayUnit,
    setFxOverride,
    convertToBase,
    updateCompanyField,
    applyApiCompany,
    fieldsLocked,
    persist,
  };
}

function mapApiMerge(data: Record<string, unknown>, prev: CompanyProfile): CompanyProfile {
  return {
    ...prev,
    companyName: String(data.companyName || prev.companyName),
    ticker: String(data.ticker || prev.ticker),
    stockPrice: Number(data.currentPrice ?? prev.stockPrice),
    marketCap: Number(data.marketCap ?? prev.marketCap),
    sharesOutstanding: Number(data.sharesOutstanding ?? prev.sharesOutstanding),
    revenue: Number(data.revenue ?? prev.revenue),
    ebitda: Number(data.ebitda ?? prev.ebitda),
    ebit: Number(data.ebit ?? prev.ebit),
    netIncome: Number(data.netIncome ?? prev.netIncome),
    cash: Number(data.cash ?? prev.cash),
    debt: Number(data.debt ?? prev.debt),
    workingCapital: Number(data.workingCapital ?? prev.workingCapital),
    freeCashFlow: Number(data.freeCashFlow ?? prev.freeCashFlow),
    capex: Number(Math.abs(Number(data.capex ?? prev.capex))),
    depreciationAndAmortization: Number(data.depreciationAndAmortization ?? prev.depreciationAndAmortization),
    historicalRevenueGrowth: Number(data.historicalRevenueGrowth ?? prev.historicalRevenueGrowth),
    historicalEbitdaMargin: Number(data.historicalEbitdaMargin ?? prev.historicalEbitdaMargin),
    historicalEbitMargin: Number(data.historicalEbitMargin ?? prev.historicalEbitMargin),
    historicalFcfMargin: Number(data.historicalFcfMargin ?? prev.historicalFcfMargin),
  };
}
