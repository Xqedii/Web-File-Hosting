<template>
  <div class="flex-1 h-full flex flex-col items-center justify-center p-8 bg-[#0a0a0a]/50 relative overflow-hidden">
    <canvas 
      ref="canvasRef" 
      class="w-full max-w-3xl h-[300px] z-10"
      width="1024" 
      height="300"
    ></canvas>

    <div class="w-full max-w-3xl mt-8 z-20 bg-[#141414]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
      <div class="flex items-center gap-6">
        <button 
          @click="togglePlay"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-[#40E0D0] text-black hover:scale-105 transition-transform shadow-[0_0_15px_rgba(64,224,208,0.3)] shrink-0"
        >
          <svg v-if="!isPlaying" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>

        <div class="flex-1 flex flex-col gap-1.5">
          <input 
            type="range" 
            min="0" 
            :max="duration" 
            step="0.1" 
            v-model="currentTime"
            @input="seek"
            class="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#40E0D0] hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
          />
          <div class="flex justify-between text-[10px] text-[#888] font-mono font-medium">
            <span>{{ formatTime(currentTime) }}</span>
            <span>{{ formatTime(duration) }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 w-24 shrink-0 group">
          <svg v-if="volume > 0.5" class="text-[#888] group-hover:text-white transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          <svg v-else-if="volume > 0" class="text-[#888] group-hover:text-white transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          <svg v-else class="text-[#888] group-hover:text-white transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            v-model="volume"
            @input="updateVolume"
            class="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
          />
        </div>
      </div>
    </div>

    <audio 
      ref="audioRef" 
      :src="src" 
      crossorigin="anonymous"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @ended="isPlaying = false"
      class="hidden"
    ></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ src: string }>();

const audioRef = ref<HTMLAudioElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let animationFrameId: number;

const initAudioContext = () => {
  if (!audioRef.value || audioContext) return;

  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  
  source = audioContext.createMediaElementSource(audioRef.value);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  analyser.fftSize = 8192;
  drawVisualizer();
};

const drawVisualizer = () => {
  if (!canvasRef.value || !analyser) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  const sampleRate = audioContext?.sampleRate || 44100;
  
  const draw = () => {
    animationFrameId = requestAnimationFrame(draw);
    analyser!.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const minHz = 20;
    const maxHz = 15000;
    const barCount = 80;

    const gap = 4;
    const totalGap = (barCount - 1) * gap;
    const barWidth = (canvas.width - totalGap) / barCount;
    let x = 0;

    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(64, 224, 208, 0.4)";

    for (let i = 0; i < barCount; i++) {
      const startFreq = minHz * Math.pow(maxHz / minHz, i / barCount);
      const endFreq = minHz * Math.pow(maxHz / minHz, (i + 1) / barCount);
      
      const nyquist = sampleRate / 2;
      let startIndex = Math.floor((startFreq / nyquist) * bufferLength);
      let endIndex = Math.ceil((endFreq / nyquist) * bufferLength);
      
      if (startIndex < 0) startIndex = 0;
      if (endIndex > bufferLength) endIndex = bufferLength;
      if (endIndex <= startIndex) endIndex = startIndex + 1;

      let sum = 0;
      let count = 0;
      for (let j = startIndex; j < endIndex; j++) {
        sum += dataArray[j];
        count++;
      }
      
      const val = count > 0 ? sum / count : 0;
      const boost = Math.pow(val / 255, 1.8) * 255; 
      const barHeight = Math.max(4, (boost / 255) * canvas.height * 1);

      const alpha = 0.3 + (val / 255) * 0.4;
      ctx.fillStyle = `rgba(64, 224, 208, ${alpha})`;
      
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(x, canvas.height - barHeight, barWidth, barHeight, 10);
      } else {
        ctx.rect(x, canvas.height - barHeight, barWidth, barHeight);
      }
      ctx.fill();

      x += barWidth + gap;
    }
  };

  draw();
};

const togglePlay = async () => {
  if (!audioRef.value) return;

  if (!audioContext) {
    initAudioContext();
  }

  if (audioContext?.state === 'suspended') {
    await audioContext.resume();
  }

  if (isPlaying.value) {
    audioRef.value.pause();
    isPlaying.value = false;
  } else {
    audioRef.value.play();
    isPlaying.value = true;
  }
};

const seek = () => {
  if (audioRef.value) {
    audioRef.value.currentTime = currentTime.value;
  }
};

const updateVolume = () => {
  if (audioRef.value) {
    audioRef.value.volume = volume.value;
  }
};

const handleTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime;
  }
};

const handleLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration;
  }
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  if (audioContext) {
    audioContext.close();
  }
});
</script>