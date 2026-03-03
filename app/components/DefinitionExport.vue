<script setup lang="ts">
import type { InventoryDefinition } from '../../shared/types/model'

const props = defineProps<{
  definition: InventoryDefinition
}>()

const toast = useToast()

const definitionText = computed(() =>
  `zoom=${props.definition.zoom}\n`
  + `modelroll=${props.definition.modelRoll}\n`
  + `modelpitch=${props.definition.modelPitch}\n`
  + `modelyaw=${props.definition.modelYaw}\n`
  + `offsetx=${props.definition.offsetX}\n`
  + `offsety=${props.definition.offsetY}`
)

async function copyToClipboard() {
  await navigator.clipboard.writeText(definitionText.value)
  toast.add({ title: 'Definition copied to clipboard', icon: 'i-lucide-check', color: 'success' })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-lg">
          Export
        </h3>
        <UButton
          label="Copy"
          icon="i-lucide-copy"
          size="sm"
          color="neutral"
          variant="outline"
          @click="copyToClipboard"
        />
      </div>
    </template>

    <pre class="text-sm font-mono bg-elevated rounded p-3 select-all">{{ definitionText }}</pre>
  </UCard>
</template>
