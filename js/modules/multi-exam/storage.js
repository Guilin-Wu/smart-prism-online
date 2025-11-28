/* eslint-disable no-undef */
'use strict';

import { State } from '../../config/state.js';

const COLLECTIONS_KEY = 'G_MultiExam_Collections_V2';
const LEGACY_LIST_KEY = 'G_MultiExamData';

async function readCollections() {
    const stored = await localforage.getItem(COLLECTIONS_KEY);
    if (!stored) return {};
    if (typeof stored === 'string') {
        try {
            return JSON.parse(stored);
        } catch (err) {
            console.warn('无法解析旧版考试列表数据，已重置:', err);
            return {};
        }
    }
    return stored;
}

async function writeCollections(data) {
    await localforage.setItem(COLLECTIONS_KEY, data);
}

function syncCurrentCollection(collections) {
    const savedId = localStorage.getItem('G_MultiExam_ActiveId');
    const fallbackId = Object.keys(collections)[0] || 'default';
    const activeId = (savedId && collections[savedId]) ? savedId : fallbackId;
    State.currentCollectionId = activeId;
    window.G_CurrentCollectionId = activeId;
    return activeId;
}

export async function ensureCollectionsExist() {
    let collections = await readCollections();

    if (!collections || Object.keys(collections).length === 0) {
        const legacyJson = localStorage.getItem(LEGACY_LIST_KEY);
        const legacyData = legacyJson ? JSON.parse(legacyJson) : [];
        collections = {
            default: {
                name: '默认考试列表',
                exams: Array.isArray(legacyData) ? legacyData : []
            }
        };
        await writeCollections(collections);
    }

    syncCurrentCollection(collections);
    return collections;
}

export async function getCollectionsSnapshot() {
    const collections = await ensureCollectionsExist();
    return JSON.parse(JSON.stringify(collections));
}

export async function loadMultiExamData() {
    const collections = await ensureCollectionsExist();
    const current = collections[State.currentCollectionId] || { exams: [] };
    return (current.exams || []).map(item => ({
        ...item,
        isHidden: Boolean(item.isHidden)
    }));
}

export async function saveMultiExamData(examArray) {
    const collections = await ensureCollectionsExist();
    if (!collections[State.currentCollectionId]) {
        collections[State.currentCollectionId] = {
            name: '默认考试列表',
            exams: []
        };
    }
    collections[State.currentCollectionId].exams = examArray;
    await writeCollections(collections);
    return collections;
}

export async function renderCollectionSelect(selectEl) {
    if (!selectEl) return;
    const collections = await ensureCollectionsExist();
    selectEl.innerHTML = Object.entries(collections).map(([id, info]) => {
        const count = Array.isArray(info.exams) ? info.exams.length : 0;
        const selected = id === State.currentCollectionId ? 'selected' : '';
        return `<option value="${id}" ${selected}>${info.name} (${count}次考试)</option>`;
    }).join('');
}

export async function setActiveCollection(collectionId) {
    const collections = await ensureCollectionsExist();
    if (!collections[collectionId]) return false;
    State.currentCollectionId = collectionId;
    window.G_CurrentCollectionId = collectionId;
    localStorage.setItem('G_MultiExam_ActiveId', collectionId);
    return true;
}

export async function createCollection(name) {
    if (!name) return null;
    const collections = await ensureCollectionsExist();
    const id = `col_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    collections[id] = { name, exams: [] };
    await writeCollections(collections);
    await setActiveCollection(id);
    return id;
}

export async function renameActiveCollection(newName) {
    if (!newName) return false;
    const collections = await ensureCollectionsExist();
    const current = collections[State.currentCollectionId];
    if (!current || current.name === newName) return false;
    current.name = newName;
    await writeCollections(collections);
    return true;
}

export async function deleteActiveCollection() {
    const collections = await ensureCollectionsExist();
    const keys = Object.keys(collections);
    if (keys.length <= 1) {
        throw new Error('这是最后一个列表，无法删除');
    }
    delete collections[State.currentCollectionId];
    await writeCollections(collections);
    const nextId = Object.keys(collections)[0];
    await setActiveCollection(nextId);
    return nextId;
}

export { COLLECTIONS_KEY };

