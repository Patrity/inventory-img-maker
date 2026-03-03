<script setup lang="ts">
import type { InventoryDefinition, LitModel } from '~~/shared/types/model'

const props = defineProps<{
  model: LitModel | null
  definition: InventoryDefinition
}>()

const nativeCanvas = ref<HTMLCanvasElement | null>(null)
const scaledCanvas = ref<HTMLCanvasElement | null>(null)
const { renderToCanvas, renderScaled } = useModelRenderer()

const SCALE = 10

function renderAll() {
  if (!nativeCanvas.value || !scaledCanvas.value || !props.model) return
  renderToCanvas(nativeCanvas.value, props.model, props.definition)
  renderScaled(scaledCanvas.value, nativeCanvas.value, SCALE)
}

watch(
  () => [props.model, props.definition] as const,
  async () => {
    await nextTick()
    renderAll()
  },
  { deep: true }
)

onMounted(() => {
  if (props.model) renderAll()
})
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold text-lg">
        Preview
      </h3>
    </template>

    <div
      v-if="!model"
      class="flex items-center justify-center h-48 text-muted"
    >
      Upload a model to preview
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-4"
    >
      <div class="flex items-center gap-6">
        <div class="flex flex-col items-center gap-1">
          <span class="text-xs text-muted">36x32</span>
          <div class="border border-default rounded p-1 bg-[#3E3529]">
            <canvas
              ref="nativeCanvas"
              width="36"
              height="32"
              class="block"
            />
          </div>
        </div>

        <div class="flex flex-col items-center gap-1">
          <span class="text-xs text-muted">Scaled ({{ SCALE }}x)</span>
          <div class="border border-default rounded p-1 bg-[#3E3529]">
            <canvas
              ref="scaledCanvas"
              :width="36 * SCALE"
              :height="32 * SCALE"
              class="block"
              style="image-rendering: pixelated;"
            />
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
