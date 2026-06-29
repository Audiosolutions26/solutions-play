## Architecture audit (Phase 1) + scoped refactor proposal

The codebase is already reasonably layered: three React contexts (`ConfigProvider`, `ShortcutsProvider`, `PlayerProvider`), feature logic isolated in `src/lib/play-*.ts`, hooks in `src/hooks/`, and presentation in `src/components/play/`. It does **not** need a ground-up restructure. Below are the real problems worth fixing, ordered by value-to-risk, plus the wide-reaching items I recommend **not** doing.

### Findings (grounded in actual files)

**Single-responsibility violations**
- `PlayApp.tsx` (292 lines) mixes the layout shell, all 8 dialog-state hooks, AND five inline "controller" components carrying business logic: `KeyboardShortcuts`, `MarkerController` (fade-out timing), `ProgramLogger`, `TextoDoDiaAutoPlay` (TTS), `LiveTextAutoOpen`.
- `BottomPanels.tsx` (298 lines) bundles six unrelated panels (`PlayedPanel`, `TodayPanel`, `NotesPanel`, `LiveTextPanel`, `MiniSitePanel`, `TextoDoDiaPanel`).

**Business logic inside UI**
- Marker fade-out interval logic and carimbo tone live in `MarkerController` JSX file.
- `SpeechSynthesis` TTS lives inline in `TextoDoDiaAutoPlay`.
- Raw `localStorage` get/set with try-catch duplicated in `NotesPanel`, `TextoDoDiaPanel`, and several `play-*` libs.

**Duplication**
- `PanelHeader` (icon + title bar) defined in `BottomPanels.tsx`; the same visual pattern is re-implemented in other panels.
- `localStorage` read/write try-catch boilerplate repeated across many files.
- `toLocaleTimeString`/`toLocaleDateString("pt-BR")` formatting repeated.

**Prop drilling**
- `PlayApp → TopBar` passes 11 props (`panels` + 10 callbacks), several forwarded again `TopBar → AppMenu`. This is UI/dialog orchestration state.

**Files >200 lines** — note `ui/sidebar.tsx` (744) and `ui/chart.tsx` (331) are shadcn vendor files and will be left untouched.

### Proposed scope — what I'll actually change

**Tier A — low risk, high value (recommend doing now)**
```text
[ SPLIT ]     BottomPanels.tsx → PlayedPanel.tsx, TodayPanel.tsx, NotesPanel.tsx,
                                  LiveTextPanel.tsx, MiniSitePanel.tsx, TextoDoDiaPanel.tsx
              (BottomPanels.tsx kept as a re-export barrel → no import changes anywhere)
[ EXTRACTED ] PanelHeader → src/components/play/PanelHeader.tsx (shared)
[ EXTRACTED ] localStorage try-catch → src/lib/storage.ts (readJson/writeJson + useLocalStorage hook)
[ EXTRACTED ] PlayApp controllers → src/hooks/use-keyboard-shortcuts, use-marker-controller,
                                     use-program-logger, use-texto-do-dia-autoplay, use-live-text-autoopen
              (PlayApp renders <PlayerControllers/> wrapper; identical runtime behavior)
```

**Tier B — moderate risk (do only if you approve each)**
```text
[ EXTRACTED ] dialog/panel UI state in PlayApp → useAppUiState hook (panels, options, advanced,
                                                  beep, secoes, devices, shortcuts, activeTab)
[ MERGED ]    duplicated pt-BR date/time formatters → src/lib/format.ts
```

### Explicitly NOT doing (flagged per your constraint)

- **Phase 5 feature-folder migration + barrel `index.ts` per module**: rewriting every import path across a working Electron + TanStack app (generated `routeTree.gen.ts`, IPC wiring) is the single highest-risk change with zero user-visible benefit and high regression chance. Recommend declining.
- **Phase 4 mass renames** of exported functions/short vars in `play-*` libs (`fmt`, `add`, `del`, `m`, `b`, `t`): these are public module APIs imported widely; renaming risks breakage for no behavior gain. I'll only rename *local* throwaway vars inside files I'm already splitting.
- Touching shadcn `ui/*` vendor components.

### Verification after each tier
`tsgo --noEmit` clean + a Playwright smoke pass (load app, switch each bottom tab, open a dialog, confirm no console errors and identical layout screenshots).

### Decision needed
1. Approve **Tier A** as the safe baseline?
2. Include **Tier B**, or skip?
3. Confirm you accept my recommendation to **skip the full folder migration and mass renames** (or tell me to proceed despite the risk).