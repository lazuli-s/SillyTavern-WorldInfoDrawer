// Book/folder import dialog flows (file picker wiring, JSON parsing,
// per-book create-and-rollback) for the book context menu.

const createImportDialogResolver = (resolve, abortController) => {
  let isDone = false;
  let timeoutId = null;

  const finish = (value) => {
    if (isDone) return;
    isDone = true;
    abortController.abort();
    clearTimeout(timeoutId);
    resolve(value);
  };

  return {
    finish,
    isDone: () => isDone,
    setTimeoutId: (nextTimeoutId) => {
      timeoutId = nextTimeoutId;
    },
  };
};

const readImportedJsonFile = async (input, finish) => {
  const [file] = input.files ?? [];
  if (!file) {
    finish(null);
    return;
  }
  try {
    finish(JSON.parse(await file.text()));
  } catch {
    finish(null);
  }
};

const watchImportDialogCancel = (input, finish) => () => {
  setTimeout(() => {
    if ((input.files?.length ?? 0) === 0) {
      finish(null);
    }
  }, 0);
};

export const createBookImportHandlers = ({
  listPanelState,
  state,
  coreUiSelectors,
  folderDeps,
  refreshList,
}) => {
  const openImportDialog = () => {
    const input = document.querySelector(coreUiSelectors.importFileInput);
    if (!input) return null;

    return new Promise((resolve) => {
      const abortController = new AbortController();
      const dialogResolver = createImportDialogResolver(resolve, abortController);
      const onChange = () => readImportedJsonFile(input, dialogResolver.finish);
      const onWindowFocus = watchImportDialogCancel(input, dialogResolver.finish);

      input.value = '';
      input.addEventListener('change', onChange, { once: true, signal: abortController.signal });
      window.addEventListener('focus', onWindowFocus, {
        once: true,
        signal: abortController.signal,
      });
      dialogResolver.setTimeoutId(setTimeout(() => dialogResolver.finish(null), 15000));

      try {
        input.click();
      } catch {
        dialogResolver.finish(null);
      }
    });
  };

  const parseFolderImportPayload = async (file) => {
    if (!file) return null;
    let payload;
    try {
      payload = JSON.parse(await file.text());
    } catch (error) {
      console.warn('[STWID] Failed to parse folder import file', error);
      toastr.error('Folder import failed: invalid JSON.');
      return null;
    }
    const books = payload?.books;
    if (!books || typeof books !== 'object' || Array.isArray(books)) {
      toastr.error('Folder import failed: missing "books" object.');
      return null;
    }
    return books;
  };

  const buildImportedBookName = (rawName, currentNames) => {
    let importedName = rawName;
    let index = 1;
    while (currentNames.has(importedName)) {
      const suffix = index === 1 ? ' (imported)' : ` (imported ${index})`;
      importedName = `${rawName}${suffix}`;
      index += 1;
    }
    return importedName;
  };

  const importSingleBook = async (rawName, bookData, currentNames) => {
    if (!bookData || typeof bookData !== 'object') return null;
    const entries = bookData.entries;
    if (!entries || typeof entries !== 'object') return null;
    const metadata =
      typeof bookData.metadata === 'object' && bookData.metadata ? bookData.metadata : {};
    const importedName = buildImportedBookName(rawName, currentNames);
    let bookCreated = false;
    try {
      const created = await state.createNewWorldInfo(importedName, { interactive: false });
      if (!created) return null;
      const nextPayload = {
        entries: structuredClone(entries),
        metadata: structuredClone(metadata),
      };
      folderDeps.sanitizeFolderMetadata(nextPayload.metadata);
      await state.saveWorldInfo(importedName, nextPayload, true);
      bookCreated = true;
      currentNames.add(importedName);
      return { createdName: importedName };
    } catch (error) {
      console.warn('[STWID] Failed to import book:', importedName, error);
      if (bookCreated) {
        try {
          await state.deleteWorldInfo?.(importedName);
        } catch (rollbackError) {
          console.warn('[STWID] Rollback failed for book:', importedName, rollbackError);
          toastr.warning(
            `Import cleanup failed for "${importedName}". Delete this book manually if it appears in the lorebook list.`,
          );
        }
      }
      return { failedName: rawName };
    }
  };

  const showFolderImportResult = async (createdNames, failedBooks) => {
    if (!createdNames.length && !failedBooks.length) {
      toastr.warning('Folder import finished with no new books.');
      return false;
    }
    if (createdNames.length) {
      await refreshList();
    }
    if (failedBooks.length) {
      toastr.error(
        `Import failed for ${failedBooks.length} book${failedBooks.length === 1 ? '' : 's'}: ${failedBooks.slice(0, 3).join(', ')}${failedBooks.length > 3 ? '…' : ''}`,
      );
    }
    if (createdNames.length) {
      toastr.success(
        `Imported ${createdNames.length} book${createdNames.length === 1 ? '' : 's'}.`,
      );
    }
    return createdNames.length > 0;
  };

  const importFolderFile = async (file) => {
    const books = await parseFolderImportPayload(file);
    if (!books) return false;
    const currentNames = new Set(state.getWorldNames ? state.getWorldNames() : state.world_names);
    const createdNames = [];
    const failedBooks = [];
    for (const [rawName, bookData] of Object.entries(books)) {
      const result = await importSingleBook(rawName, bookData, currentNames);
      if (result?.createdName) {
        createdNames.push(result.createdName);
      }
      if (result?.failedName) {
        failedBooks.push(result.failedName);
      }
    }
    return showFolderImportResult(createdNames, failedBooks);
  };

  const openFolderImportDialog = () => {
    if (!listPanelState.folderImportInput) {
      listPanelState.folderImportInput = document.createElement('input');
      listPanelState.folderImportInput.type = 'file';
      listPanelState.folderImportInput.accept = '.json,application/json';
      listPanelState.folderImportInput.hidden = true;
      listPanelState.folderImportInput.addEventListener('change', async () => {
        const [file] = listPanelState.folderImportInput.files ?? [];
        listPanelState.folderImportInput.value = '';
        await importFolderFile(file);
      });
      document.body.append(listPanelState.folderImportInput);
    }
    listPanelState.folderImportInput.click();
  };

  return {
    openImportDialog,
    openFolderImportDialog,
  };
};
