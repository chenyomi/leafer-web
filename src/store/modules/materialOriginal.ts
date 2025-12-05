import { defineStore } from 'pinia'
import { ref } from 'vue'

interface OriginalEntry {
  dataUrl: string
  secondLevelGIds: string[]
  sourceUrl?: string
}

interface OriginalMap {
  [materialId: string]: OriginalEntry
}

export const useMaterialOriginalStore = defineStore('materialOriginal', () => {
  const originals = ref<OriginalMap>({})

  function setOriginal(materialId: string, dataUrl: string, secondLevelGIds: string[] = [], sourceUrl?: string) {
    originals.value[materialId] = { dataUrl, secondLevelGIds, sourceUrl }
  }

  function getOriginal(materialId: string): string | undefined {
    return originals.value[materialId]?.dataUrl
  }

  function getSecondLevelGIds(materialId: string): string[] {
    return originals.value[materialId]?.secondLevelGIds || []
  }

  function hasOriginal(materialId: string): boolean {
    return !!originals.value[materialId]?.dataUrl
  }

  function clearOriginal(materialId: string) {
    delete originals.value[materialId]
  }

  // 新增：清空所有原始素材缓存
  function clearAllOriginals() {
    originals.value = {}
  }

  return {
    originals,
    setOriginal,
    getOriginal,
    getSecondLevelGIds,
    hasOriginal,
    clearOriginal,
    clearAllOriginals
  }
}, {
  // 改为使用 sessionStorage，避免长期占用 localStorage
  persist: {
    key: 'scipixa-material-original',
    storage: sessionStorage,
  }
})