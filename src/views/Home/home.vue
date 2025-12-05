<script setup lang="ts">
</script>

<template>
    <a-space>
        <a-button
                @click="
                  $router.push({
                    name: 'Editor',
                  })
                "
        >
            进入编辑器
        </a-button>
<!--        <a-button-->
<!--                @click="-->
<!--                  $router.push({-->
<!--                    name: 'PsParser',-->
<!--                  })-->
<!--                "-->
<!--        >-->
<!--            PSD解析器-->
<!--        </a-button>-->
        <a-button
                @click="
                  $router.push({
                    name: 'CusComponents',
                  })
                "
        >
            自定义组件演示
        </a-button>
    </a-space>
</template>
