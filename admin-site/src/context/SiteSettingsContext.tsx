import { createContext, PropsWithChildren, useContext } from "react";
import { sampleSettings } from "../data/sampleData";
import { SiteSettings } from "../types";

const SiteSettingsContext = createContext<SiteSettings>(sampleSettings);

export function SiteSettingsProvider({ value, children }: PropsWithChildren<{ value: SiteSettings }>): JSX.Element {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext);
}
