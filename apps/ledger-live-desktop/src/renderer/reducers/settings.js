// @flow

import { handleActions } from "redux-actions";
import { createSelector } from "reselect";
import type { OutputSelector, InputSelector as Selector } from "reselect";
import {
  findCurrencyByTicker,
  getCryptoCurrencyById,
  listSupportedFiats,
  getFiatCurrencyByTicker,
} from "@ledgerhq/live-common/lib/currencies";
import type { DeviceModelId } from "@ledgerhq/devices";
import type { CryptoCurrency, Currency } from "@ledgerhq/live-common/lib/types";
import type { DeviceModelInfo } from "@ledgerhq/live-common/lib/types/manager";
import type { PortfolioRange } from "@ledgerhq/live-common/lib/portfolio/v2/types";
import { getEnv } from "@ledgerhq/live-common/lib/env";
import { getLanguages, defaultLocaleForLanguage } from "~/config/languages";
import type { State } from ".";
import regionsByKey from "../screens/settings/sections/General/regions.json";
import { getSystemLocale } from "~/helpers/systemLocale";
export type CurrencySettings = {
  confirmationsNb: number,
};

export type CurrenciesSettings = {
  [id: string]: CurrencySettings,
};

type ConfirmationDefaults = {
  confirmationsNb: ?{
    min: number,
    def: number,
    max: number,
  },
};

export const currencySettingsDefaults = (c: Currency): ConfirmationDefaults => {
  let confirmationsNb;
  if (c.type === "CryptoCurrency") {
    const { blockAvgTime } = c;
    if (blockAvgTime) {
      const def = Math.ceil((30 * 60) / blockAvgTime); // 30 min approx validation
      confirmationsNb = { min: 1, def, max: 3 * def };
    }
  }
  return {
    confirmationsNb,
  };
};

const bitcoin = getCryptoCurrencyById("bitcoin");
const ethereum = getCryptoCurrencyById("ethereum");
export const possibleIntermediaries = [bitcoin, ethereum];

export const timeRangeDaysByKey = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
  all: -1,
};

export type LangAndRegion = { language: string, region: ?string, useSystem: boolean };
export type SettingsState = {
  loaded: boolean, // is the settings loaded from db (it not we don't save them)
  hasCompletedOnboarding: boolean,
  counterValue: string,
  preferredDeviceModel: DeviceModelId,
  hasInstalledApps: boolean,
  lastSeenDevice: ?DeviceModelInfo,
  latestFirmware: any,
  language: ?string,
  theme: ?string,
  /** DEPRECATED, use field `locale` instead */
  region: ?string,
  locale: ?string,
  orderAccounts: string,
  countervalueFirst: boolean,
  autoLockTimeout: number,
  selectedTimeRange: PortfolioRange,
  marketIndicator: "eastern" | "western",
  currenciesSettings: {
    [currencyId: string]: CurrencySettings,
  },
  pairExchanges: {
    [pair: string]: ?string,
  },
  developerMode: boolean,
  shareAnalytics: boolean,
  sentryLogs: boolean,
  lastUsedVersion: string,
  dismissedBanners: string[],
  accountsViewMode: "card" | "list",
  nftsViewMode: "grid" | "list",
  showAccountsHelperBanner: boolean,
  hideEmptyTokenAccounts: boolean,
  sidebarCollapsed: boolean,
  discreetMode: boolean,
  carouselVisibility: number,
  starredAccountIds?: string[],
  blacklistedTokenIds: string[],
  hiddenNftCollections: string[],
  deepLinkUrl: ?string,
  firstTimeLend: boolean,
  showClearCacheBanner: boolean,
  fullNodeEnabled: boolean,

  // developer settings
  allowDebugApps: boolean,
  allowExperimentalApps: boolean,
  enablePlatformDevTools: boolean,
  catalogProvider: string,
  USBTroubleshootingIndex?: number,
  enableLearnPageStagingUrl?: boolean,
  swap: {
    hasAcceptedIPSharing: false,
    selectableCurrencies: string[],
    acceptedProviders: string[],
    KYC: {
      [string]: {
        id: string,
        status: string,
      },
    },
  },
  starredMarketCoins: string[],
};

const defaultsForCurrency: Currency => CurrencySettings = crypto => {
  const defaults = currencySettingsDefaults(crypto);
  return {
    confirmationsNb: defaults.confirmationsNb ? defaults.confirmationsNb.def : 0,
  };
};

const DEFAULT_LANGUAGE_LOCALE = "en";
export const getInitialLanguageLocale = (fallbackLocale: string = DEFAULT_LANGUAGE_LOCALE) => {
  const detectedLanguage = getSystemLocale() || fallbackLocale;
  return getLanguages().find(lang => detectedLanguage.startsWith(lang)) || fallbackLocale;
};

const DEFAULT_LOCALE = "en-US";
export const getInitialLocale = () => {
  const initialLanguageLocale = getInitialLanguageLocale();
  return defaultLocaleForLanguage[initialLanguageLocale] || DEFAULT_LOCALE;
};

const INITIAL_STATE: SettingsState = {
  hasCompletedOnboarding: false,
  counterValue: "USD",
  language: getInitialLanguageLocale(),
  theme: null,
  region: null,
  locale: getInitialLocale(),
  orderAccounts: "balance|desc",
  countervalueFirst: false,
  autoLockTimeout: 10,
  selectedTimeRange: "month",
  marketIndicator: "western",
  currenciesSettings: {},
  pairExchanges: {},
  developerMode: !!process.env.__DEV__,
  loaded: false,
  shareAnalytics: true,
  sentryLogs: true,
  lastUsedVersion: __APP_VERSION__,
  dismissedBanners: [],
  accountsViewMode: "list",
  nftsViewMode: "list",
  showAccountsHelperBanner: true,
  hideEmptyTokenAccounts: getEnv("HIDE_EMPTY_TOKEN_ACCOUNTS"),
  sidebarCollapsed: false,
  discreetMode: false,
  preferredDeviceModel: "nanoS",
  hasInstalledApps: true,
  carouselVisibility: 0,
  lastSeenDevice: null,
  latestFirmware: null,
  blacklistedTokenIds: [],
  hiddenNftCollections: [],
  deepLinkUrl: null,
  firstTimeLend: false,
  showClearCacheBanner: false,
  fullNodeEnabled: false,

  // developer settings
  allowDebugApps: false,
  allowExperimentalApps: false,
  enablePlatformDevTools: false,
  catalogProvider: "production",
  enableLearnPageStagingUrl: false,
  USBTroubleshootingIndex: undefined,
  swap: {
    hasAcceptedIPSharing: false,
    acceptedProviders: [],
    selectableCurrencies: [],
    KYC: {},
  },
  starredMarketCoins: [],
};

const pairHash = (from, to) => `${from.ticker}_${to.ticker}`;

export const supportedCountervalues: { value: string, label: string, currency: Currency }[] = [
  ...listSupportedFiats(),
  ...possibleIntermediaries,
]
  .map(currency => ({
    value: currency.ticker,
    label: `${currency.name} - ${currency.ticker}`,
    currency,
  }))
  .sort((a, b) => (a.currency.name < b.currency.name ? -1 : 1));

const handlers: Object = {
  SETTINGS_SET_PAIRS: (
    state: SettingsState,
    {
      pairs,
    }: {
      pairs: Array<{
        from: Currency,
        to: Currency,
        exchange: string,
      }>,
    },
  ) => {
    const copy = { ...state };
    copy.pairExchanges = { ...copy.pairExchanges };
    for (const { to, from, exchange } of pairs) {
      copy.pairExchanges[pairHash(from, to)] = exchange;
    }
    return copy;
  },
  SAVE_SETTINGS: (state: SettingsState, { payload }: { payload: $Shape<SettingsState> }) => {
    if (!payload) return state;
    const changed = Object.keys(payload).some(key => payload[key] !== state[key]);
    if (!changed) return state;
    return {
      ...state,
      ...payload,
    };
  },
  FETCH_SETTINGS: (
    state: SettingsState,
    { payload: settings }: { payload: $Shape<SettingsState> },
  ) => {
    if (
      settings.counterValue &&
      !supportedCountervalues.find(({ currency }) => currency.ticker === settings.counterValue)
    ) {
      settings.counterValue = INITIAL_STATE.counterValue;
    }
    return {
      ...state,
      ...settings,
      loaded: true,
    };
  },
  SETTINGS_DISMISS_BANNER: (state: SettingsState, { payload: bannerId }) => ({
    ...state,
    dismissedBanners: [...state.dismissedBanners, bannerId],
  }),
  SHOW_TOKEN: (state: SettingsState, { payload: tokenId }) => {
    const ids = state.blacklistedTokenIds;
    return {
      ...state,
      blacklistedTokenIds: ids.filter(id => id !== tokenId),
    };
  },
  BLACKLIST_TOKEN: (state: SettingsState, { payload: tokenId }) => {
    const ids = state.blacklistedTokenIds;
    return {
      ...state,
      blacklistedTokenIds: [...ids, tokenId],
    };
  },
  UNHIDE_NFT_COLLECTION: (state: SettingsState, { payload: collectionId }) => {
    const ids = state.hiddenNftCollections;
    return {
      ...state,
      hiddenNftCollections: ids.filter(id => id !== collectionId),
    };
  },
  HIDE_NFT_COLLECTION: (state: SettingsState, { payload: collectionId }) => {
    const collections = state.hiddenNftCollections;
    return {
      ...state,
      hiddenNftCollections: [...collections, collectionId],
    };
  },
  LAST_SEEN_DEVICE_INFO: (
    state: SettingsState,
    { payload }: { payload: { lastSeenDevice: DeviceModelInfo, latestFirmware: any } },
  ) => ({
    ...state,
    lastSeenDevice: Object.assign({}, state.lastSeenDevice, payload.lastSeenDevice),
    latestFirmware: payload.latestFirmware,
  }),
  SET_DEEPLINK_URL: (state: SettingsState, { payload: deepLinkUrl }) => ({
    ...state,
    deepLinkUrl,
  }),
  SET_FIRST_TIME_LEND: (state: SettingsState) => ({
    ...state,
    firstTimeLend: false,
  }),
  SET_SWAP_SELECTABLE_CURRENCIES: (state: SettingsState, { payload }) => ({
    ...state,
    swap: {
      ...state.swap,
      selectableCurrencies: payload,
    },
  }),
  SET_SWAP_KYC: (state: SettingsState, { payload }) => {
    const { provider, id, status } = payload;
    const KYC = { ...state.swap.KYC };

    if (id && status) {
      KYC[provider] = { id, status };
    } else {
      delete KYC[provider];
    }

    return {
      ...state,
      swap: {
        ...state.swap,
        KYC,
      },
    };
  },
  SET_SWAP_ACCEPTED_IP_SHARING: (state: SettingsState, { payload }) => ({
    ...state,
    swap: {
      ...state.swap,
      hasAcceptedIPSharing: payload,
    },
  }),
  ACCEPT_SWAP_PROVIDER: (state: SettingsState, { payload }) => ({
    ...state,
    swap: {
      ...state.swap,
      acceptedProviders: [...new Set([...(state.swap?.acceptedProviders || []), payload])],
    },
  }),
  // used to debug performance of redux updates
  DEBUG_TICK: state => ({ ...state }),
  ADD_STARRED_MARKET_COINS: (state: SettingsState, { payload }) => ({
    ...state,
    starredMarketCoins: [...state.starredMarketCoins, payload],
  }),
  REMOVE_STARRED_MARKET_COINS: (state: SettingsState, { payload }) => ({
    ...state,
    starredMarketCoins: state.starredMarketCoins.filter(id => id !== payload),
  }),
};

// TODO refactor selectors to *Selector naming convention

export const storeSelector = (state: State): SettingsState => state.settings;

export const settingsExportSelector = storeSelector;

export const discreetModeSelector = (state: State): boolean => state.settings.discreetMode === true;

export const getCounterValueCode = (state: State) => state.settings.counterValue;

export const deepLinkUrlSelector = (state: State) => state.settings.deepLinkUrl;

export const counterValueCurrencyLocalSelector = (state: SettingsState): Currency =>
  findCurrencyByTicker(state.counterValue) || getFiatCurrencyByTicker("USD");

export const counterValueCurrencySelector: OutputSelector<State, void, Currency> = createSelector(
  storeSelector,
  counterValueCurrencyLocalSelector,
);

export const countervalueFirstSelector: OutputSelector<State, void, boolean> = createSelector(
  storeSelector,
  s => s.countervalueFirst,
);

export const developerModeSelector = (state: State): boolean => state.settings.developerMode;

export const lastUsedVersionSelector = (state: State): string => state.settings.lastUsedVersion;

export const userThemeSelector = (state: State): ?string => {
  const savedVal = state.settings.theme;
  return ["dark", "light"].includes(savedVal) ? savedVal : "dark";
};

type LanguageAndUseSystemLanguage = {
  language: string,
  useSystemLanguage: boolean,
};

const languageAndUseSystemLangSelector = (state: State): LanguageAndUseSystemLanguage => {
  const { language } = state.settings;
  if (language && getLanguages().includes(language)) {
    return { language, useSystemLanguage: false };
  } else {
    return {
      language: getInitialLanguageLocale(),
      useSystemLanguage: true,
    };
  }
};

/** Use this for translations */
export const languageSelector: OutputSelector<State, void, string> = createSelector(
  languageAndUseSystemLangSelector,
  o => o.language,
);

export const useSystemLanguageSelector: OutputSelector<State, void, boolean> = createSelector(
  languageAndUseSystemLangSelector,
  o => o.useSystemLanguage,
);

const isValidRegionLocale = (locale: string) => {
  return regionsByKey.hasOwnProperty(locale);
};

const localeFallbackToLanguageSelector = (state: State): { locale: string } => {
  const { language, locale, region } = state.settings;
  if (!locale && language) {
    /*
      Handle settings data saved with the old logic, where the region settings'
        entire locale was not being saved (the locale was split in 2 strings on
        "-" and only the 2nd part was saved)
        e.g: for "fr-BE" we would only save {region: "BE"}
    */
    const potentialLocale = region ? `${language}-${region}` : language;
    if (isValidRegionLocale(potentialLocale)) return { locale: potentialLocale };
  } else if (locale && isValidRegionLocale(locale)) return { locale };
  return { locale: language || DEFAULT_LOCALE };
};

/** Use this for number and dates formatting. */
export const localeSelector: OutputSelector<State, void, string> = createSelector(
  localeFallbackToLanguageSelector,
  o => o.locale || getInitialLocale(),
);

export const getOrderAccounts = (state: State) => state.settings.orderAccounts;

export const areSettingsLoaded = (state: State) => state.settings.loaded;

export const currencySettingsLocaleSelector = (
  settings: SettingsState,
  currency: Currency,
): CurrencySettings => {
  const currencySettings = settings.currenciesSettings[currency.ticker];
  const val = { ...defaultsForCurrency(currency), ...currencySettings };
  return val;
};

type CSS = Selector<*, { currency: CryptoCurrency }, CurrencySettings>;

export const currencyPropExtractor = (_: *, { currency }: *) => currency;

// TODO: drop (bad perf implication)
export const currencySettingsSelector: CSS = createSelector(
  storeSelector,
  currencyPropExtractor,
  currencySettingsLocaleSelector,
);

export const exchangeSettingsForPairSelector = (
  state: State,
  { from, to }: { from: Currency, to: Currency },
): ?string => state.settings.pairExchanges[pairHash(from, to)];

export const confirmationsNbForCurrencySelector = (
  state: State,
  { currency }: { currency: CryptoCurrency },
): number => {
  const obj = state.settings.currenciesSettings[currency.ticker];
  if (obj) return obj.confirmationsNb;
  const defs = currencySettingsDefaults(currency);
  return defs.confirmationsNb ? defs.confirmationsNb.def : 0;
};

export const preferredDeviceModelSelector = (state: State) => state.settings.preferredDeviceModel;
export const sidebarCollapsedSelector = (state: State) => state.settings.sidebarCollapsed;
export const accountsViewModeSelector = (state: State) => state.settings.accountsViewMode;
export const nftsViewModeSelector = (state: State) => state.settings.nftsViewMode;
export const marketIndicatorSelector = (state: State) => state.settings.marketIndicator;
export const sentryLogsSelector = (state: State) => state.settings.sentryLogs;
export const autoLockTimeoutSelector = (state: State) => state.settings.autoLockTimeout;
export const shareAnalyticsSelector = (state: State) => state.settings.shareAnalytics;
export const selectedTimeRangeSelector = (state: State) => state.settings.selectedTimeRange;
export const hasInstalledAppsSelector = (state: State) => state.settings.hasInstalledApps;
export const carouselVisibilitySelector = (state: State) => state.settings.carouselVisibility;
export const USBTroubleshootingIndexSelector = (state: State) =>
  state.settings.USBTroubleshootingIndex;

export const allowDebugAppsSelector = (state: State) => state.settings.allowDebugApps;
export const allowExperimentalAppsSelector = (state: State) => state.settings.allowExperimentalApps;
export const enablePlatformDevToolsSelector = (state: State) =>
  state.settings.enablePlatformDevTools;
export const catalogProviderSelector = (state: State) => state.settings.catalogProvider;

export const enableLearnPageStagingUrlSelector = (state: State) =>
  state.settings.enableLearnPageStagingUrl;

export const blacklistedTokenIdsSelector = (state: State) => state.settings.blacklistedTokenIds;
export const hiddenNftCollectionsSelector = (state: State) => state.settings.hiddenNftCollections;
export const hasCompletedOnboardingSelector = (state: State) =>
  state.settings.hasCompletedOnboarding;

export const dismissedBannersSelector = (state: State) => state.settings.dismissedBanners || [];

export const dismissedBannerSelector = (state: State, { bannerKey }: { bannerKey: string }) =>
  (state.settings.dismissedBanners || []).includes(bannerKey);

export const dismissedBannerSelectorLoaded = (bannerKey: string) => (state: State) =>
  (state.settings.dismissedBanners || []).includes(bannerKey);

export const hideEmptyTokenAccountsSelector = (state: State) =>
  state.settings.hideEmptyTokenAccounts;

export const lastSeenDeviceSelector = (state: State) => state.settings.lastSeenDevice;

export const latestFirmwareSelector = (state: State) => state.settings.latestFirmware;

export const swapHasAcceptedIPSharingSelector = (state: State) =>
  state.settings.swap.hasAcceptedIPSharing;

export const swapSelectableCurrenciesSelector = (state: Object) =>
  state.settings.swap.selectableCurrencies;

export const swapAcceptedProvidersSelector = (state: State) =>
  state.settings.swap.acceptedProviders;

export const swapKYCSelector = (state: Object) => state.settings.swap.KYC;

export const showClearCacheBannerSelector = (state: Object) => state.settings.showClearCacheBanner;

export const exportSettingsSelector: OutputSelector<State, void, *> = createSelector(
  counterValueCurrencySelector,
  state => state.settings.currenciesSettings,
  state => state.settings.pairExchanges,
  developerModeSelector,
  blacklistedTokenIdsSelector,
  (
    counterValueCurrency,
    currenciesSettings,
    pairExchanges,
    developerModeEnabled,
    blacklistedTokenIds,
  ) => ({
    counterValue: counterValueCurrency.ticker,
    currenciesSettings,
    pairExchanges,
    developerModeEnabled,
    blacklistedTokenIds,
  }),
);

export const starredMarketCoinsSelector = (state: State) => state.settings.starredMarketCoins;

export default handleActions(handlers, INITIAL_STATE);
