<template>
  <aside class="bg-[#141414]/20 backdrop-blur-[20px] border-l border-white/10 p-[30px] flex flex-col gap-8 w-[280px] h-full overflow-y-auto custom-scroll">
    <div>
      <h3 class="text-xs font-semibold text-white mb-4 uppercase tracking-wider">File Type</h3>
      <div class="space-y-3">
        <label v-for="type in fileTypes" :key="type.key" class="flex items-center gap-3 cursor-pointer group">
          <div class="relative flex items-center">
            <input 
              type="checkbox" 
              v-model="filters.types" 
              :value="type.key" 
              class="peer appearance-none w-4 h-4 border border-white/20 rounded bg-transparent checked:bg-[#40E0D0] checked:border-[#40E0D0] transition-all" 
            />
            <svg class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-black opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span class="text-[13px] text-[#ccc] group-hover:text-white transition-colors select-none">{{ type.label }}</span>
        </label>
      </div>
    </div>

    <div>
      <h3 class="text-xs font-semibold text-white mb-4 uppercase tracking-wider">Sort by date</h3>
      <div class="flex gap-2 bg-white/5 p-1 rounded-lg">
        <button 
          @click="filters.sortOrder = 'desc'"
          class="flex-1 py-1.5 text-[12px] rounded-md transition-all font-medium"
          :class="filters.sortOrder === 'desc' ? 'bg-[#40E0D0] text-black shadow-lg' : 'text-[#888] hover:text-white'"
        >
          Newest
        </button>
        <button 
          @click="filters.sortOrder = 'asc'"
          class="flex-1 py-1.5 text-[12px] rounded-md transition-all font-medium"
          :class="filters.sortOrder === 'asc' ? 'bg-[#40E0D0] text-black shadow-lg' : 'text-[#888] hover:text-white'"
        >
          Oldest
        </button>
      </div>
    </div>

    <div>
      <h3 class="text-xs font-semibold text-white mb-4 uppercase tracking-wider">Owner</h3>
      <div class="flex gap-2 bg-white/5 p-1 rounded-lg">
        <button 
          v-for="owner in ['All', 'Me']" 
          :key="owner"
          @click="filters.owner = owner"
          class="flex-1 py-1.5 text-[12px] rounded-md transition-all font-medium"
          :class="filters.owner === owner ? 'bg-[#40E0D0] text-black shadow-lg' : 'text-[#888] hover:text-white'"
        >
          {{ owner }}
        </button>
      </div>
    </div>

    <div>
      <h3 class="text-xs font-semibold text-white mb-4 uppercase tracking-wider">Date modified</h3>
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <span class="text-[12px] text-[#666]">From</span>
          <input type="date" v-model="filters.dateFrom" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#40E0D0] transition-colors [color-scheme:dark]" />
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-[12px] text-[#666]">To</span>
          <input type="date" v-model="filters.dateTo" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#40E0D0] transition-colors [color-scheme:dark]" />
        </div>
      </div>
    </div>

    <div class="mt-auto pt-6 border-t border-white/10">
      <button 
        @click="resetFilters" 
        class="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors border border-white/10 outline-none"
      >
        Reset Filters
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
const filters = useState('fileFilters', () => ({
  types: [] as string[],
  owner: 'All',
  dateFrom: '',
  dateTo: '',
  sortOrder: 'desc'
}));

const fileTypes = [
  { label: 'Documents', key: 'doc' },
  { label: 'Images', key: 'img' },
  { label: 'Audio', key: 'audio' },
  { label: 'Video', key: 'video' },
  { label: 'Logs', key: 'logs' },
  { label: 'Spreadsheets', key: 'sheet' },
  { label: 'Presentations', key: 'pres' },
  { label: 'Archives', key: 'archive' },
  { label: 'Other', key: 'other' }
];

const resetFilters = () => {
  filters.value.types = [];
  filters.value.owner = 'All';
  filters.value.dateFrom = '';
  filters.value.dateTo = '';
  filters.value.sortOrder = 'desc';
};
</script>

<style scoped>
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
</style>