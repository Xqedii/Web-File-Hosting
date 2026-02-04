<template>
  <div class="fixed inset-0 pointer-events-none z-0 bg-[#050505]">
    <Transition name="fade-slow">
      <div 
        v-if="bgSettings.url" 
        :key="bgSettings.url" 
        class="absolute inset-0 bg-cover bg-center bg-no-repeat bg-transition" 
        :style="{ 
          backgroundImage: `url(${bgSettings.url})`,
          filter: `blur(${bgSettings.blur}px) brightness(${bgSettings.brightness}%)`,
          transform: 'scale(1.05)'
        }"
      ></div>
      <canvas v-else ref="canvasRef" class="absolute top-0 left-0 w-full h-full block"></canvas>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

const userCookie = useCookie<any>('user_session');

const bgSettings = useState('globalBackgroundSettings', () => ({
  url: userCookie.value?.background || null,
  blur: userCookie.value?.backgroundBlur || 0,
  brightness: userCookie.value?.backgroundBrightness ?? 100
}));

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationFrameId: number;

const initCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let time = 0;

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const drawLines = (gridSize: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
  };

  const animate = () => {
    time += 0.001;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gridSize = 60;
    drawLines(gridSize, 'rgba(255, 255, 255, 0.02)');
    const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
    const gradientWidth = 900;
    const travel = diagonal + gradientWidth;
    const progress = time % 1;
    const offset = -gradientWidth + (travel * progress) % travel;
    const gradient = ctx.createLinearGradient(offset, offset, offset + gradientWidth, offset + gradientWidth);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.09)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    drawLines(gridSize, gradient);
    animationFrameId = requestAnimationFrame(animate);
  };

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  animate();

  return () => {
    window.removeEventListener('resize', resizeCanvas);
    cancelAnimationFrame(animationFrameId);
  };
};

let cleanup: (() => void) | undefined;

onMounted(() => {
  if (!bgSettings.value.url) {
    cleanup = initCanvas();
  }
});

watch(() => bgSettings.value.url, (newVal) => {
  if (cleanup) cleanup();
  if (!newVal) {
    setTimeout(() => {
      cleanup = initCanvas();
    }, 100);
  }
});

onUnmounted(() => {
  if (cleanup) cleanup();
});

watch(() => userCookie.value, (newVal) => {
  if (newVal) {
    bgSettings.value.url = newVal.background || null;
    bgSettings.value.blur = newVal.backgroundBlur || 0;
    bgSettings.value.brightness = newVal.backgroundBrightness ?? 100;
  }
}, { deep: true });
</script>

<style scoped>
.bg-transition {
  transition: filter 0.7s cubic-bezier(0.4, 0, 0.2, 1), transform 0.7s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: filter, transform;
}
.fade-slow-enter-active, .fade-slow-leave-active {
  transition: opacity 0.3s ease;
}
.fade-slow-enter-from, .fade-slow-leave-to {
  opacity: 0;
}
</style>