import { useSearchQuery } from '@/composables'
import { SortOptions, TorrentState } from '@/constants/qbit'
import { extractHostname } from '@/helpers'
import qbit from '@/services/qbit'
import { AddTorrentPayload, GetTorrentPayload } from '@/types/qbit/payloads'
import { Torrent } from '@/types/vuetorrent'
import { useArrayFilter } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, MaybeRefOrGetter, reactive, ref, toValue } from 'vue'

export const useTorrentStore = defineStore(
  'torrents',
  () => {
    const torrents = ref<Torrent[]>([])

    const isTextFilterActive = ref(true)
    const isStatusFilterActive = ref(true)
    const isCategoryFilterActive = ref(true)
    const isTagFilterActive = ref(true)
    const isTrackerFilterActive = ref(true)

    const textFilter = ref('')
    const statusFilter = ref<TorrentState[]>([])
    const categoryFilter = ref<string[]>([])
    const tagFilter = ref<(string | null)[]>([])
    const trackerFilter = ref<(string | null)[]>([])

    type matchFn = (t: Torrent) => boolean
    const matchStatus: matchFn = t => statusFilter.value.includes(t.state)
    const matchCategory: matchFn = t => categoryFilter.value.includes(t.category)
    const matchTag: matchFn = t => (t.tags.length === 0 && tagFilter.value.includes(null)) || t.tags.some(tag => tagFilter.value.includes(tag))
    const matchTracker: matchFn = t => trackerFilter.value.includes(extractHostname(t.tracker))

    const torrentsWithFilters = useArrayFilter(torrents, torrent => {
      return !(
        (statusFilter.value.length > 0 && isStatusFilterActive.value && !matchStatus(torrent)) ||
        (categoryFilter.value.length > 0 && isCategoryFilterActive.value && !matchCategory(torrent)) ||
        (tagFilter.value.length > 0 && isTagFilterActive.value && !matchTag(torrent)) ||
        (trackerFilter.value.length > 0 && isTrackerFilterActive.value && !matchTracker(torrent))
      )
    })

    const sortOptions = reactive({
      isCustomSortEnabled: false,
      sortBy: SortOptions.DEFAULT,
      reverseOrder: false
    })
    const getTorrentsPayload = computed<GetTorrentPayload>(() => {
      return {
        sort: sortOptions.isCustomSortEnabled ? SortOptions.DEFAULT : sortOptions.sortBy,
        reverse: sortOptions.reverseOrder
      }
    })

    const { results: filteredTorrents } = useSearchQuery(
      torrentsWithFilters,
      () => (isTextFilterActive.value ? textFilter.value : null),
      torrent => torrent.name,
      results => {
        if (sortOptions.isCustomSortEnabled) {
          if (sortOptions.sortBy === 'priority') {
            results.sort((a, b) => {
              if (a.priority > 0 && b.priority > 0) return a.priority - b.priority
              else if (a.priority <= 0 && b.priority <= 0) return a.added_on - b.added_on
              else if (a.priority <= 0) return 1
              else return -1
            })
          } else {
            results.sort((a, b) => a[sortOptions.sortBy] - b[sortOptions.sortBy] || a.added_on - b.added_on)
          }
          if (sortOptions.reverseOrder) results.reverse()
        }
        return results
      }
    )

    async function setTorrentCategory(hashes: string[], category: string) {
      await qbit.setCategory(hashes, category)
    }

    async function addTorrentTags(hashes: string[], tags: string[]) {
      await qbit.addTorrentTag(hashes, tags)
    }

    async function removeTorrentTags(hashes: string[], tags?: string[]) {
      await qbit.removeTorrentTag(hashes, tags)
    }

    function getTorrentByHash(hash: string) {
      return torrents.value.find(t => t.hash === hash)
    }

    function getTorrentIndexByHash(hash: string) {
      return filteredTorrents.value.findIndex(t => t.hash === hash)
    }

    async function deleteTorrents(hashes: string[], deleteWithFiles: boolean) {
      await qbit.deleteTorrents(hashes, deleteWithFiles)
    }

    async function moveTorrents(mode: 'dl' | 'save', hashes: string[], newPath: string) {
      switch (mode) {
        case 'dl':
          return await qbit.setTorrentDownloadPath(hashes, newPath)
        case 'save':
          return await qbit.setTorrentSavePath(hashes, newPath)
      }
    }

    async function addTorrents(torrents: File[], urls: string, payload: AddTorrentPayload) {
      return await qbit.addTorrents(torrents, urls, payload)
    }

    async function renameTorrent(hash: string, newName: string) {
      await qbit.setTorrentName(hash, newName)
    }

    async function resumeTorrents(hashes: MaybeRefOrGetter<string[]>) {
      await qbit.resumeTorrents(toValue(hashes))
    }

    async function forceResumeTorrents(hashes: MaybeRefOrGetter<string[]>) {
      await qbit.forceStartTorrents(toValue(hashes))
    }

    async function pauseTorrents(hashes: MaybeRefOrGetter<string[]>) {
      await qbit.pauseTorrents(toValue(hashes))
    }

    async function recheckTorrents(hashes: MaybeRefOrGetter<string[]>) {
      await qbit.recheckTorrents(toValue(hashes))
    }

    async function setTorrentPriority(hashes: string[], priority: 'increasePrio' | 'decreasePrio' | 'topPrio' | 'bottomPrio') {
      await qbit.setTorrentPriority(hashes, priority)
    }

    async function exportTorrent(hash: string) {
      return await qbit.exportTorrent(hash)
    }

    return {
      torrents,
      isTextFilterActive,
      isStatusFilterActive,
      isCategoryFilterActive,
      isTagFilterActive,
      isTrackerFilterActive,
      textFilter,
      statusFilter,
      categoryFilter,
      tagFilter,
      trackerFilter,
      torrentsWithFilters,
      filteredTorrents,
      sortOptions,
      getTorrentsPayload,
      setTorrentCategory,
      addTorrentTags,
      removeTorrentTags,
      getTorrentByHash,
      getTorrentIndexByHash,
      deleteTorrents,
      moveTorrents,
      addTorrents,
      renameTorrent,
      resumeTorrents,
      forceResumeTorrents,
      pauseTorrents,
      recheckTorrents,
      setTorrentPriority,
      exportTorrent,
      $reset: () => {
        torrents.value = []

        isTextFilterActive.value = true
        textFilter.value = ''
        isStatusFilterActive.value = true
        statusFilter.value = []
        isCategoryFilterActive.value = true
        categoryFilter.value = []
        isTagFilterActive.value = true
        tagFilter.value = []
        isTrackerFilterActive.value = true
        trackerFilter.value = []
      }
    }
  },
  {
    persistence: {
      enabled: true,
      storageItems: [{ storage: localStorage, excludePaths: ['torrents'] }]
    }
  }
)
