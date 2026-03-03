<script setup lang="ts">
import type { LitModel, InventoryDefinition } from '~~/shared/types/model'

const model = shallowRef<LitModel | null>(null)
const definition = reactive<InventoryDefinition>({
  zoom: 1434,
  modelRoll: 0,
  modelPitch: 500,
  modelYaw: 0,
  offsetX: 0,
  offsetY: 0
})

function onModelLoaded(litModel: LitModel) {
  model.value = litModel
}
</script>

<template>
  <UContainer class="py-6">
    <ModelUpload
      class="mb-6"
      @loaded="onModelLoaded"
    />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ModelPreview
        :model="model"
        :definition="definition"
      />
      <DefinitionControls v-model:definition="definition" />
    </div>

    <DefinitionExport
      :definition="definition"
      class="mt-6"
    />
  </UContainer>
</template>
