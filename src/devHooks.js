import { useGameStore, serializeState } from "./store/gameStore.js";
import { storage } from "./persistence/storage.js";

// Dev/test-only global hooks for the Playwright QA harness.
//
// Gated on `import.meta.env.DEV`, which Vite statically replaces with `false`
// in production builds — so the whole body is dead-code-eliminated and the
// deployed Pages build never exposes `window.__fc`. Real players can't reach
// any of this.
export function installDevHooks() {
  if (!import.meta.env.DEV) return;
  window.__fc = {
    store: useGameStore,
    getState: () => useGameStore.getState(),
    setState: (patch) => useGameStore.setState(patch),

    // Bootstrap a real game without clicking through the new-game UI. Setting
    // `teamName` while `league` is null triggers App's init effect, which
    // cascades league / cup / AI tiers / calendar / inbox. `squad` is already
    // generated on App mount. This is the seam the save-injection flow uses.
    newGame: ({ teamName = "Red Lion FC", tier = 11, mode = "casual", managerName = "QA Manager" } = {}) => {
      useGameStore.setState({
        activeProfileId: "qa-profile",
        gameMode: mode,
        managerName,
        leagueTier: tier,
        teamName,
      });
    },

    // Serialize the live store the same way saveGame does (Sets → arrays),
    // producing a blob that loadGame can hydrate. Used to capture save
    // fixtures and to round-trip a save through persistence.
    dumpSave: () => serializeState(useGameStore.getState()),

    // The real storage adapter, so QA flows can seed profiles/saves through
    // the same code path the game uses (IndexedDB — localStorage injection
    // stopped working when game data moved off it).
    storage,
  };
}
