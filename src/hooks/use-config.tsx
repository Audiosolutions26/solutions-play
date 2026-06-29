import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  type ConfigState, type ConfigValue, defaultConfig, loadConfig, saveConfig,
} from "@/lib/play-config";

interface ConfigCtx {
  config: ConfigState;
  draft: ConfigState;
  setDraft: (key: string, value: ConfigValue) => void;
  commit: () => void;
  reset: () => void;
  cancel: () => void;
  get: (key: string) => ConfigValue;
}

const Ctx = createContext<ConfigCtx | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfigState>(() =>
    typeof window === "undefined" ? defaultConfig() : loadConfig(),
  );
  const [draft, setDraftState] = useState<ConfigState>(config);

  // keep draft in sync when committed config changes externally
  useEffect(() => setDraftState(config), [config]);

  const value = useMemo<ConfigCtx>(() => ({
    config,
    draft,
    setDraft: (key, v) => setDraftState((d) => ({ ...d, [key]: v })),
    commit: () => { setConfig(draft); saveConfig(draft); },
    reset: () => { const d = defaultConfig(); setDraftState(d); },
    cancel: () => setDraftState(config),
    get: (key) => config[key],
  }), [config, draft]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
