import { useCallback } from "react";
import { getSaveKey } from "../utils/profile.js";

/**
 * useSaveGame — extracts exportSave, importSave, and deleteSave callbacks.
 *
 * @param {Object} config
 * @param {string} config.teamName
 * @param {number|null} config.activeSaveSlot
 * @param {React.MutableRefObject} config.activeProfileIdRef
 * @param {Function} config.setImportStatus
 * @param {Function} config.setSaveSlotSummaries
 */
export function useSaveGame({
  teamName,
  activeSaveSlot,
  activeProfileIdRef,
  setImportStatus,
  setSaveSlotSummaries,
}) {
  // Export save data as a JSON file download
  const exportSave = useCallback(async () => {
    try {
      const result = await window.storage.get(`jfg-save-${activeSaveSlot}`);
      if (!result) { setImportStatus("no-save"); setTimeout(() => setImportStatus(null), 2500); return; }
      const blob = new Blob([result.value], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `jfg-save-${teamName || "backup"}-slot${activeSaveSlot}-${date}.json`;
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
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !parsed.teamName) {
        setImportStatus("invalid");
        setTimeout(() => setImportStatus(null), 3000);
        return;
      }
      await window.storage.set(`jfg-save-${activeSaveSlot}`, text);
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
    if (!slot || !activeProfileIdRef.current) return;
    try {
      await window.storage.delete(getSaveKey(activeProfileIdRef.current, slot));
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
