<script setup lang="ts">
import type { InventoryDefinition } from '~~/shared/types/model'

const definition = defineModel<InventoryDefinition>('definition', { required: true })

const params = [
  { key: 'zoom' as const, label: 'Zoom', min: 1, max: 4000, step: 1 },
  { key: 'modelRoll' as const, label: 'Roll', min: 0, max: 2047, step: 1 },
  { key: 'modelPitch' as const, label: 'Pitch', min: 0, max: 2047, step: 1 },
  { key: 'modelYaw' as const, label: 'Yaw', min: 0, max: 2047, step: 1 },
  { key: 'offsetX' as const, label: 'Offset X', min: -200, max: 200, step: 1 },
  { key: 'offsetY' as const, label: 'Offset Y', min: -200, max: 200, step: 1 }
]
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold text-lg">
        Definition Parameters
      </h3>
    </template>

    <div class="space-y-5">
      <div
        v-for="param in params"
        :key="param.key"
      >
        <UFormField :label="param.label">
          <div class="flex items-center gap-4">
            <USlider
              v-model="definition[param.key]"
              :min="param.min"
              :max="param.max"
              :step="param.step"
              class="flex-1"
            />
            <UInputNumber
              v-model="definition[param.key]"
              :min="param.min"
              :max="param.max"
              :step="param.step"
              class="w-28"
              size="sm"
            />
          </div>
        </UFormField>
      </div>
    </div>
  </UCard>
</template>
