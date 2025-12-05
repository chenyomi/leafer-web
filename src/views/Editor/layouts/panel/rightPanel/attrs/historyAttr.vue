<template>
  <div class="history-attr">
    <history :versionList="historyList" :loading="historyLoading" :hasMore="historyHasMore" @loadMore="loadMoreHistory"/>
  </div>
</template>

<script setup lang="ts">
import history from '@/views/audit/components/history.vue'
import { auditMaterialApi } from '@/api/audit/material';
import { useRoute } from 'vue-router'

const route = useRoute()
const outId = ref('')

onMounted(() => {
  const query = route.query.id
  outId.value = query as string
  getHistoryList()
})

const historyList = ref([]) // 历史列表
const historyLoading = ref(false)
const historyHasMore = ref(true)
const historyParams = reactive({
  pageNum: 1,
  pageSize: 20
})
/** 获取素材历史列表 */
const getHistoryList = async () => {
  if (!outId.value || historyLoading.value) return

  try {
    historyLoading.value = true
    const res = await auditMaterialApi.getMaterialVersionChangeList({
      ...historyParams,
      materialId: outId.value
    })

    if (historyParams.pageNum === 1) {
      historyList.value = res.records
    } else {
      historyList.value.push(...res.records)
    }

    historyHasMore.value = res.records.length === historyParams.pageSize
    if (historyHasMore.value) {
      historyParams.pageNum++
    }
  } catch (error) {
    console.error('获取历史列表失败:', error)
  } finally {
    historyLoading.value = false
  }
}

/** 加载更多历史记录 */
const loadMoreHistory = () => {
  getHistoryList()
}

</script>

<style scoped lang="less">
.history-attr {
  padding: 0 10px;
  user-select: none;
}
</style>
