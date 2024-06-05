<script setup lang="ts">
import ColoredChip from '@/components/Core/ColoredChip.vue'
import { useVueTorrentStore } from '@/stores'
import { Torrent } from '@/types/vuetorrent'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    torrent: Torrent
    titleKey?: string
    value: (t: Torrent) => string[]
    emptyValueKey: string
    color: (t: Torrent) => string
    enableHashColor?: boolean
  }>(),
  {
    enableHashColor: false
  }
)

const { hideChipIfUnset } = storeToRefs(useVueTorrentStore())

const val = computed(() => props.value(props.torrent))
const emptyValue = computed(() => val.value.length < 1 || val.value[0] === '')
const shouldShowChip = computed(() => !(hideChipIfUnset.value && emptyValue.value))
</script>

<template>
  <div v-if="shouldShowChip" class="d-flex flex-column flex-grow-1" style="max-width: 100%; width: 8.333333%">
    <div v-if="titleKey" class="text-caption text-grey">
      {{ $t(titleKey) }}
    </div>
    <div class="d-flex flex-row flex-gap-column-small">
      <ColoredChip v-if="emptyValue" :default-color="color(torrent)" :disabled="true" :value="$t(emptyValueKey)" size="small" />
      <ColoredChip v-for="v in val" v-else :default-color="color(torrent)" :disabled="!enableHashColor" :value="v" size="small" />
    </div>
  </div>
</template>
