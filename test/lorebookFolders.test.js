import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  createBookInFolder,
  getFolderFromMetadata,
  getFolderRegistry,
  registerFolderName,
  sanitizeFolderMetadata,
  setFolderBooksActive,
  setFolderCollapsed,
  setFolderInMetadata,
  updateFolderCount,
} from "../src/lorebookFolders.js";

const FOLDER_REGISTRY_STORAGE_KEY = "stwid--folder-registry";

const createLocalStorageMock = () => {
  const store = new Map();
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
};

const createClassList = (initial = []) => {
  const classes = new Set(initial);
  return {
    add: (...tokens) => {
      for (const token of tokens) classes.add(token);
    },
    remove: (...tokens) => {
      for (const token of tokens) classes.delete(token);
    },
    toggle: (token, force) => {
      if (force === undefined) {
        if (classes.has(token)) {
          classes.delete(token);
          return false;
        }
        classes.add(token);
        return true;
      }
      if (force) classes.add(token);
      else classes.delete(token);
      return force;
    },
    contains: (token) => classes.has(token),
  };
};

describe("lorebookFolders", () => {
  let originalLocalStorage;
  let originalDocument;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    originalDocument = globalThis.document;
    globalThis.localStorage = createLocalStorageMock();
  });

  afterEach(() => {
    if (originalLocalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = originalLocalStorage;
    }
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
    vi.restoreAllMocks();
  });

  describe("getFolderRegistry", () => {
    it("returns an empty list when localStorage is unavailable", () => {
      delete globalThis.localStorage;
      expect(getFolderRegistry()).toEqual([]);
    });

    it("returns [] and rewrites storage when persisted value is invalid JSON", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      globalThis.localStorage.getItem.mockReturnValueOnce("{");
      expect(getFolderRegistry()).toEqual([]);
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
        FOLDER_REGISTRY_STORAGE_KEY,
        "[]",
      );
    });

    it("sanitizes empty/invalid/duplicate names and persists normalized values", () => {
      globalThis.localStorage.setItem(
        FOLDER_REGISTRY_STORAGE_KEY,
        JSON.stringify(["  Alpha  ", "", "Alpha", "bad/name", "Beta"]),
      );

      expect(getFolderRegistry()).toEqual(["Alpha", "Beta"]);
      expect(globalThis.localStorage.setItem).toHaveBeenLastCalledWith(
        FOLDER_REGISTRY_STORAGE_KEY,
        JSON.stringify(["Alpha", "Beta"]),
      );
    });
  });

  describe("registerFolderName", () => {
    it("rejects empty names", () => {
      expect(registerFolderName("   ")).toEqual({
        ok: false,
        folder: null,
        reason: "empty",
      });
    });

    it("rejects names containing /", () => {
      expect(registerFolderName("bad/name")).toEqual({
        ok: false,
        folder: null,
        reason: "invalid",
      });
    });

    it("adds new folders and keeps case-insensitive sorted order", () => {
      globalThis.localStorage.setItem(
        FOLDER_REGISTRY_STORAGE_KEY,
        JSON.stringify(["zeta", "Alpha"]),
      );

      expect(registerFolderName("beta")).toEqual({
        ok: true,
        folder: "beta",
      });
      expect(getFolderRegistry()).toEqual(["Alpha", "beta", "zeta"]);
    });

    it("does not duplicate existing folder names", () => {
      globalThis.localStorage.setItem(
        FOLDER_REGISTRY_STORAGE_KEY,
        JSON.stringify(["Alpha"]),
      );
      registerFolderName("Alpha");
      expect(getFolderRegistry()).toEqual(["Alpha"]);
    });
  });

  describe("metadata helpers", () => {
    it("getFolderFromMetadata returns normalized folder names", () => {
      expect(getFolderFromMetadata({ folder: "  Arc One  " })).toBe("Arc One");
    });

    it("getFolderFromMetadata returns null for missing/invalid values", () => {
      expect(getFolderFromMetadata(null)).toBeNull();
      expect(getFolderFromMetadata({})).toBeNull();
      expect(getFolderFromMetadata({ folder: "bad/name" })).toBeNull();
      expect(getFolderFromMetadata({ folder: "   " })).toBeNull();
    });

    it("setFolderInMetadata sets normalized folder when valid", () => {
      const metadata = {};
      const result = setFolderInMetadata(metadata, "  Lore  ");
      expect(result).toEqual({ ok: true, folder: "Lore" });
      expect(metadata.folder).toBe("Lore");
    });

    it("setFolderInMetadata removes folder key for empty values", () => {
      const metadata = { folder: "Old" };
      const result = setFolderInMetadata(metadata, " ");
      expect(result).toEqual({ ok: true, folder: null });
      expect(Object.hasOwn(metadata, "folder")).toBe(false);
    });

    it("setFolderInMetadata rejects invalid folder values and non-objects", () => {
      expect(setFolderInMetadata(null, "A")).toEqual({ ok: false, folder: null });
      const metadata = {};
      expect(setFolderInMetadata(metadata, "bad/name")).toEqual({
        ok: false,
        folder: null,
      });
      expect(Object.hasOwn(metadata, "folder")).toBe(false);
    });

    it("sanitizeFolderMetadata normalizes valid folder and removes invalid values", () => {
      const valid = { folder: "  KeepMe " };
      expect(sanitizeFolderMetadata(valid)).toBe("KeepMe");
      expect(valid.folder).toBe("KeepMe");

      const invalid = { folder: "bad/name" };
      expect(sanitizeFolderMetadata(invalid)).toBeNull();
      expect(Object.hasOwn(invalid, "folder")).toBe(false);

      expect(sanitizeFolderMetadata({})).toBeNull();
    });
  });

  describe("ui-light helpers", () => {
    it("updateFolderCount writes count text", () => {
      const countElement = { textContent: "" };
      updateFolderCount(countElement, 7);
      expect(countElement.textContent).toBe("(7)");
    });

    it("setFolderCollapsed toggles collapsed and chevron classes", () => {
      const folderDom = {
        books: { classList: createClassList() },
        toggle: { classList: createClassList(["fa-chevron-up"]) },
      };

      setFolderCollapsed(folderDom, true);
      expect(folderDom.books.classList.contains("stwid--isCollapsed")).toBe(true);
      expect(folderDom.toggle.classList.contains("fa-chevron-down")).toBe(true);
      expect(folderDom.toggle.classList.contains("fa-chevron-up")).toBe(false);

      setFolderCollapsed(folderDom, false);
      expect(folderDom.books.classList.contains("stwid--isCollapsed")).toBe(false);
      expect(folderDom.toggle.classList.contains("fa-chevron-up")).toBe(true);
      expect(folderDom.toggle.classList.contains("fa-chevron-down")).toBe(false);
    });
  });

  describe("setFolderBooksActive", () => {
    it("updates only targeted books and calls onWorldInfoChange", async () => {
      const options = [
        { textContent: "Book A", selected: false },
        { textContent: "Book B", selected: false },
      ];
      const onWorldInfoChange = vi.fn();
      globalThis.document = {
        querySelector: vi.fn(() => ({ options })),
      };

      await setFolderBooksActive(["Book B"], true, onWorldInfoChange);

      expect(options[0].selected).toBe(false);
      expect(options[1].selected).toBe(true);
      expect(onWorldInfoChange).toHaveBeenCalledWith("__notSlashCommand__");
    });

    it("returns early when #world_info is missing", async () => {
      const onWorldInfoChange = vi.fn();
      globalThis.document = {
        querySelector: vi.fn(() => null),
      };
      await setFolderBooksActive(["Book A"], true, onWorldInfoChange);
      expect(onWorldInfoChange).not.toHaveBeenCalled();
    });
  });

  describe("createBookInFolder", () => {
    it("returns null when required dependencies are missing", async () => {
      const result = await createBookInFolder({
        folderName: "Folder",
      });
      expect(result).toBeNull();
    });

    it("returns null if popup input is cancelled", async () => {
      const createNewWorldInfo = vi.fn();
      const result = await createBookInFolder({
        folderName: "Folder",
        Popup: { show: { input: vi.fn().mockResolvedValue(null) } },
        createNewWorldInfo,
        getFreeWorldName: vi.fn(() => "New World Info"),
        loadWorldInfo: vi.fn(),
        saveWorldInfo: vi.fn(),
      });
      expect(result).toBeNull();
      expect(createNewWorldInfo).not.toHaveBeenCalled();
    });

    it("creates book, sets folder metadata, saves, registers folder, and refreshes", async () => {
      const refreshList = vi.fn();
      const saveWorldInfo = vi.fn();
      const result = await createBookInFolder({
        folderName: "  Folder A  ",
        Popup: { show: { input: vi.fn().mockResolvedValue("My Book") } },
        createNewWorldInfo: vi.fn().mockResolvedValue(true),
        getFreeWorldName: vi.fn(() => "Temp Name"),
        loadWorldInfo: vi.fn().mockResolvedValue({ metadata: {} }),
        saveWorldInfo,
        refreshList,
      });

      expect(result).toBe("My Book");
      expect(saveWorldInfo).toHaveBeenCalledWith(
        "My Book",
        { metadata: { folder: "Folder A" } },
        true,
      );
      expect(refreshList).toHaveBeenCalled();
      expect(getFolderRegistry()).toEqual(["Folder A"]);
    });

    it("returns null when folder metadata cannot be set", async () => {
      const saveWorldInfo = vi.fn();
      const result = await createBookInFolder({
        folderName: "bad/name",
        Popup: { show: { input: vi.fn().mockResolvedValue("My Book") } },
        createNewWorldInfo: vi.fn().mockResolvedValue(true),
        getFreeWorldName: vi.fn(() => "Temp Name"),
        loadWorldInfo: vi.fn().mockResolvedValue({ metadata: {} }),
        saveWorldInfo,
        refreshList: vi.fn(),
      });
      expect(result).toBeNull();
      expect(saveWorldInfo).not.toHaveBeenCalled();
    });
  });
});
