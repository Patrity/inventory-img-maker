<script setup lang="ts">
import type { LitModel } from '~~/shared/types/model'
import { decompressCacheContainer } from '~~/shared/utils/cache-container'
import { lightModel, parseModel } from '~~/shared/utils/model-parser'

const emit = defineEmits<{
  loaded: [model: LitModel]
}>()

const error = ref<string | null>(null)
const loading = ref(false)
const fileName = ref<string | null>(null)

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  error.value = null
  loading.value = true
  fileName.value = file.name

  try {
    const buffer = await file.arrayBuffer()
    const decompressed = await decompressCacheContainer(buffer)
    const def = parseModel(decompressed)
    const lit = lightModel(def)
    emit('loaded', lit)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to parse model'
    console.error('Model parse error:', e)
  } finally {
    loading.value = false
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  const file = event.dataTransfer?.files?.[0]
  if (!file) return

  // Simulate the same flow
  error.value = null
  loading.value = true
  fileName.value = file.name

  file.arrayBuffer().then(async (buffer) => {
    try {
      const decompressed = await decompressCacheContainer(buffer)
      const def = parseModel(decompressed)
      const lit = lightModel(def)
      emit('loaded', lit)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to parse model'
      console.error('Model parse error:', e)
    } finally {
      loading.value = false
    }
  })
}

const dragOver = ref(false)
</script>

<template>
  <div>
    <label
      class="flex flex-col items-center justify-center w-full min-h-36 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
      :class="dragOver ? 'border-primary bg-primary/5' : 'border-default hover:border-primary/50'"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="dragOver = false; onDrop($event)"
    >
      <div class="flex flex-col items-center gap-2 py-6">
        <UIcon
          name="i-lucide-file-up"
          class="size-8 text-muted"
        />
        <p class="text-sm font-medium">
          {{ fileName ? `Loaded: ${fileName}` : 'Drop OSRS model file here or click to browse' }}
        </p>
        <p class="text-xs text-muted">
          .dat cache model format
        </p>
      </div>
      <input
        type="file"
        accept=".dat"
        class="hidden"
        @change="onFileChange"
      >
    </label>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mt-3"
    />
  </div>
</template>
