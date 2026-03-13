import { useCallback } from "react";
import { getSaveKey } from "../utils/profile.js";
import { useGameStore } from "../store/gameStore.js";

/**
 * useSaveGame — extracts exportSave, importSave, and deleteSave callbacks.
 *
 * @param {Object} config
 * @param {string} config.teamName
 * @param {number|null} config.activeSaveSlot
 * @param {Function} config.setImportStatus
 * @param {Function} config.setSaveSlotSummaries
 */
export function useSaveGame({
  teamName,
  activeSaveSlot,
  setImportStatus,
  setSaveSlotSummaries,
}) {
  // Export save data as a JSON file download
  const exportSave = useCallback(async () => {
    setImportStatus("exporting");
    try {
      const result = await window.storage.get(getSaveKey(useGameStore.getState().activeProfileId, activeSaveSlot));
      if (!result) { setImportStatus("no-save"); setTimeout(() => setImportStatus(null), 2500); return; }
      const blob = new Blob([result.value], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      const safeName = (teamName || "backup").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      a.href = url;
      a.download = `jumpers-${safeName}-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportStatus("exported");
      setTimeout(() => setImportStatus(null), 2500);
    } catch (e) {
      console.error("Export failed:", e);
      setImportStatus("export-error");
      setTimeout(() => setImportStatus(null), 3000);
    }
  }, [teamName, activeSaveSlot]);

  // Import save from a JSON file
  const importSave = useCallback(async (file) => {
    setImportStatus("importing");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !parsed.teamName) {
        setImportStatus("invalid");
        setTimeout(() => setImportStatus(null), 3000);
        return;
      }
      await window.storage.set(getSaveKey(useGameStore.getState().activeProfileId, activeSaveSlot), text);
      setImportStatus("imported");
      setTimeout(() => {
        setImportStatus(null);
        window.location.reload();
      }, 1200);
    } catch (e) {
      console.error("Import failed:", e);
      setImportStatus("invalid");
      setTimeout(() => setImportStatus(null), 3000);
    }
  }, [activeSaveSlot]);

  // Delete saved game
  const deleteSave = useCallback(async (slotOverride) => {
    const slot = slotOverride || activeSaveSlot;
    if (!slot || !useGameStore.getState().activeProfileId) return;
    try {
      await window.storage.delete(getSaveKey(useGameStore.getState().activeProfileId, slot));
      setSaveSlotSummaries(prev => {
        const next = [...prev];
        next[slot - 1] = null;
        return next;
      });
      if (slot === activeSaveSlot) {
        setImportStatus("deleted");
        setTimeout(() => {
          setImportStatus(null);
          window.location.reload();
        }, 1200);
      }
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }, [activeSaveSlot]);

  return { exportSave, importSave, deleteSave };
}
