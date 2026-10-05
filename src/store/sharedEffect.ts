import type { AtomEffect } from 'recoil';
import toast from 'react-hot-toast';
import { electronStore } from '../utils/electronStore';
import { collectionPatch, applyCollectionPatch } from '../utils/workspace';
import { trackSave } from '../utils/editing';

export function sharedEffect<T>(key: string, restore: (value: any) => T, collection = false): AtomEffect<T> {
  return ({ setSelf, onSet, trigger }) => {
    let changed = false;
    let disposed = false;
    const offPatch = collection ? window.electronAPI?.onStorePatched?.((changedKey, patch) => {
      if (changedKey === key) { changed = true; setSelf(current => restore(applyCollectionPatch(current as unknown as { id: string }[], patch))); }
    }) : undefined;
    const unsubscribe = window.electronAPI?.onStoreChanged?.((changedKey, value) => {
      if (changedKey === key) { changed = true; setSelf(restore(value)); }
    });
    if (trigger === 'get') electronStore.get(key).then(value => {
      if (!disposed && !changed && value != null) setSelf(restore(value));
    }).catch(() => toast.error('저장된 데이터를 불러오지 못했습니다.'));
    onSet((next, previous) => {
      changed = true;
      const patch = collection ? collectionPatch(previous as unknown as {id:string}[], next as unknown as {id:string}[]) : undefined;
      const save = patch && window.electronAPI?.patchItems
        ? window.electronAPI.patchItems(key, patch)
        : collection && window.electronAPI?.mergeItems
        ? window.electronAPI.mergeItems(key, previous as unknown[], next as unknown[])
        : electronStore.set(key, next);
      trackSave(save).catch(() => toast.error('저장에 실패했습니다. 저장 공간을 확인해 주세요.'));
    });
    return () => { disposed = true; unsubscribe?.(); offPatch?.(); };
  };
}

export const restoreDates = (items: any, fields: string[]) => Array.isArray(items)
  ? items.map(item => ({ ...item, ...Object.fromEntries(fields.map(key => [key, new Date(item[key])])) })) : [];
