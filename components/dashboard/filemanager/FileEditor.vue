<template>
  <div class="absolute inset-0 flex flex-col z-[60] font-inter overflow-hidden">
    <div class="px-8 py-4 border-b border-white/10 flex justify-between items-center bg-transparent shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-white/5 rounded-md flex items-center justify-center">
          <FileIcon :name="fileName" :is-directory="false" :is-favorite="isFavorite" :icon="icon" size="18" />
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2 text-white">
            <span class="text-sm font-medium">{{ fileName }}</span>
            <span v-if="isDirty" class="text-[10px] text-[#feca57] font-bold uppercase tracking-wider">Unsaved</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button v-if="!isReadOnly && isDirty" @click="$emit('save')" class="px-4 py-2 bg-[#40E0D0] text-black text-xs font-bold rounded-lg hover:opacity-90 transition-all cursor-pointer shadow-[0_0_15px_rgba(64,224,208,0.2)]">
          Save
        </button>
        <button @click="$emit('close')" class="px-4 py-2 bg-white/5 text-white text-xs font-bold rounded-lg border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
          Close
        </button>
      </div>
    </div>

    <div class="flex-1 relative flex bg-[#141414]/30 backdrop-blur-[20px] overflow-hidden" @wheel.ctrl.prevent="handleZoom">
      <Transition name="zoom-fade">
        <div v-if="showZoomIndicator" class="absolute top-6 right-8 z-[100] px-4 py-2 rounded-xl border border-white/20 bg-[#141414]/60 backdrop-blur-xl text-white font-bold shadow-2xl tabular-nums">
          {{ currentZoomPercent }}%
        </div>
      </Transition>

      <div v-if="!isImage && !isAudio && !isVideo" ref="editorRef" class="flex-1 h-full overflow-hidden"></div>
      
      <div v-else-if="isImage" class="flex-1 h-full flex items-center justify-center p-12 overflow-hidden cursor-grab active:cursor-grabbing" @wheel.prevent="handleImageZoom" @mousedown="startDragging" @mousemove="handleDragging" @mouseup="stopDragging" @mouseleave="stopDragging">
        <img 
          ref="imgElement"
          :src="content" 
          draggable="false"
          class="block w-auto h-auto rounded-lg shadow-2xl object-contain select-none"
          :class="{ 'transition-transform duration-300 ease-out': !isDragging }"
          :style="{ 
            transform: `translate(${imgX}px, ${imgY}px) scale(${imgScale})`,
            transformOrigin: 'center center'
          }" 
        />
      </div>

      <FileAudioPlayer v-else-if="isAudio" :src="content" />
      <FileVideoPlayer v-else-if="isVideo" :src="content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { basicSetup } from 'codemirror';
import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { EditorState, Compartment, Transaction, StateField, StateEffect } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import FileAudioPlayer from './FileAudioPlayer.vue';
import FileVideoPlayer from './FileVideoPlayer.vue';
import FileIcon from './FileIcon.vue';

const props = defineProps<{ 
  path: string,
  fileName: string, 
  content: string, 
  isReadOnly: boolean, 
  isSaving: boolean, 
  isDirty: boolean,
  isFavorite: boolean,
  icon?: string
}>();

const emit = defineEmits(['update:content', 'save', 'close', 'remote-save']);

const userCookie = useCookie<any>('user_session');
const sessionId = Math.random().toString(36).substring(7);
const username = computed(() => userCookie.value?.username || 'Anonymous');
const userColor = computed(() => userCookie.value?.color || '#40E0D0');
const avatar = userCookie.value?.avatar || '';

const editorRef = ref<HTMLElement | null>(null);
let view: EditorView | null = null;
let socket: WebSocket | null = null;
const fontConfig = new Compartment();
const readOnlyConfig = new Compartment();
const imgElement = ref<HTMLImageElement | null>(null);

const fontSize = ref(14);
const imgScale = ref(1);
const imgX = ref(0);
const imgY = ref(0);
const isDragging = ref(false);
const lastMousePos = { x: 0, y: 0 };
let zoomTimeout: any = null;

const userColors = new Map<string, string>();

const getAverageColor = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!url) return resolve('#40E0D0');
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('#40E0D0');
      canvas.width = 1;
      canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      try {
        const data = ctx.getImageData(0, 0, 1, 1).data;
        resolve(`rgb(${data[0]}, ${data[1]}, ${data[2]})`);
      } catch (e) {
        resolve('#40E0D0');
      }
    };
    img.onerror = () => resolve('#40E0D0');
  });
};

class CursorWidget extends WidgetType {
  constructor(readonly name: string, readonly color: string) { super() }
  toDOM() {
    let wrap = document.createElement("span");
    wrap.className = "cm-remote-cursor";
    if (this.color === 'rainbow') {
      wrap.classList.add("rainbow");
    } else {
      wrap.style.setProperty("--cursor-color", this.color);
    }
    wrap.style.position = "relative";
    wrap.style.marginLeft = "-1px";
    wrap.style.marginRight = "-1px";
    wrap.style.verticalAlign = "middle";
    wrap.style.display = "inline-block";
    wrap.style.height = "1.2em";
    wrap.style.borderLeft = "2px solid var(--cursor-color)";

    let label = document.createElement("div");
    label.className = "cm-remote-cursor-label";
    label.textContent = this.name;
    if (this.color !== 'rainbow') {
      label.style.backgroundColor = this.color;
    }
    label.style.fontFamily = "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    label.style.position = "absolute";
    label.style.top = "-20px";
    label.style.left = "-2px";
    label.style.padding = "0px 6px";
    label.style.fontSize = "10px";
    label.style.color = "#000";
    label.style.whiteSpace = "nowrap";
    label.style.borderRadius = "3px";
    label.style.pointerEvents = "none";
    label.style.fontWeight = "bold";
    label.style.zIndex = "100";

    wrap.appendChild(label);
    return wrap;
  }
}

const updateRemoteSelection = StateEffect.define<{ id: string, name: string, anchor: number, head: number, color: string }>();
const removeRemoteSelection = StateEffect.define<string>();

const remoteSelectionsField = StateField.define<DecorationSet>({
  create() { return Decoration.none },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (let e of tr.effects) {
      if (e.is(updateRemoteSelection)) {
        const { id, name, anchor, head, color } = e.value;
        const start = Math.min(anchor, head);
        const end = Math.max(anchor, head);
        const deco = [];

        if (start !== end) {
          deco.push(Decoration.mark({ 
            attributes: { 
              class: `cm-remote-selection ${color === 'rainbow' ? 'rainbow-selection' : ''}`, 
              style: color === 'rainbow' ? '' : `background-color: ${color}40`, 
              "data-id": id 
            }, 
            userId: id 
          }).range(start, end));
        }
        deco.push(Decoration.widget({ widget: new CursorWidget(name, color), side: 1, userId: id }).range(head));

        decorations = decorations.update({
          filter: (f, t, value) => value.spec.userId !== id,
          add: deco.sort((a, b) => a.from - b.from || a.to - b.to)
        });
      } else if (e.is(removeRemoteSelection)) {
        const id = e.value;
        decorations = decorations.update({
          filter: (f, t, value) => value.spec.userId !== id
        });
      }
    }
    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});

const clampPosition = (x: number, y: number, scale: number) => {
  if (!imgElement.value) return { x, y };
  const container = imgElement.value.parentElement;
  if (!container) return { x, y };
  const containerRect = container.getBoundingClientRect();
  const baseW = imgElement.value.offsetWidth;
  const baseH = imgElement.value.offsetHeight;
  const scaledW = baseW * scale;
  const scaledH = baseH * scale;
  const dynamicLimit = 100 + (scale / 20);
  const limitX = (scaledW / 2) + (containerRect.width / 2) - dynamicLimit;
  const limitY = (scaledH / 2) + (containerRect.height / 2) - dynamicLimit;
  return {
    x: Math.max(-limitX, Math.min(limitX, x)),
    y: Math.max(-limitY, Math.min(limitY, y))
  };
};

const currentZoomPercent = computed(() => {
  if (isImage.value) {
    const s = imgScale.value;
    if (s <= 1.0) {
      const logPos = Math.log10(s / 0.2) / Math.log10(1.0 / 0.2);
      return Math.round(40 + logPos * (100 - 40));
    } else {
      const logPos = Math.log10(s / 1.0) / Math.log10(18.0 / 1.0);
      return Math.round(100 + logPos * (400 - 100));
    }
  }
  return Math.round((fontSize.value / 14) * 100);
});

const showZoomIndicator = ref(false);

const getFontTheme = (size: number) => {
  const lh = Math.round(size * 1.6);
  return EditorView.theme({
    "&": { fontSize: `${size}px` },
    ".cm-content, .cm-gutterElement": { lineHeight: `${lh}px !important` },
    ".cm-scroller": { whiteSpace: "pre !important" }
  });
};

const handleImageZoom = (e: WheelEvent) => {
  const zoomInFactor = 1.15;
  const zoomOutFactor = 1 / zoomInFactor;
  const factor = e.deltaY < 0 ? zoomInFactor : zoomOutFactor;
  const oldScale = imgScale.value;
  let newScale = Math.max(0.2, Math.min(oldScale * factor, 18.0));
  if (newScale === oldScale) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const mouseX = e.clientX - rect.left - rect.width / 2;
  const mouseY = e.clientY - rect.top - rect.height / 2;
  const ratio = newScale / oldScale;
  imgX.value = mouseX - (mouseX - imgX.value) * ratio;
  imgY.value = mouseY - (mouseY - imgY.value) * ratio;
  imgScale.value = newScale;
  checkBounds();
  showZoomIndicator.value = true;
  clearTimeout(zoomTimeout);
  zoomTimeout = setTimeout(() => showZoomIndicator.value = false, 1500);
};

const startDragging = (e: MouseEvent) => {
  if (e.button === 0 || e.button === 1) {
    isDragging.value = true;
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;
    e.preventDefault();
  }
};

const handleDragging = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const deltaX = e.clientX - lastMousePos.x;
  const deltaY = e.clientY - lastMousePos.y;
  const clamped = clampPosition(imgX.value + deltaX, imgY.value + deltaY, imgScale.value);
  imgX.value = clamped.x;
  imgY.value = clamped.y;
  lastMousePos.x = e.clientX;
  lastMousePos.y = e.clientY;
};

const stopDragging = () => {
  isDragging.value = false;
  checkBounds();
};

const getLanguage = () => {
  const ext = props.fileName.split('.').pop()?.toLowerCase() || '';
  if (['js', 'ts', 'vue'].includes(ext)) return javascript();
  if (ext === 'html') return html();
  if (ext === 'css') return css();
  if (ext === 'json') return json();
  if (ext === 'md') return markdown();
  return javascript();
};

const myHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "#c678dd" },
  { tag: t.operator, color: "#d4d4d4" },
  { tag: t.variableName, color: "#d4d4d4" },
  { tag: t.function(t.variableName), color: "#e5c07b" },
  { tag: t.propertyName, color: "#48dbfb" },
  { tag: t.string, color: "#ce9178" },
  { tag: t.number, color: "#b5cea8" },
  { tag: t.comment, color: "#6a9955", fontStyle: "italic" },
  { tag: t.punctuation, color: "#d4d4d4" },
  { tag: t.definition(t.propertyName), color: "#48dbfb" },
  { tag: t.bool, color: "#c678dd" },
  { tag: t.className, color: "#4ec9b0" },
  { tag: t.attributeName, color: "#d19a66" },
  { tag: t.tagName, color: "#569cd6" },
  { tag: t.angleBracket, color: "#808080" },
  { tag: t.atom, color: "#d7ba7d" },
  { tag: t.meta, color: "#c586c0" },
  { tag: t.unit, color: "#b5cea8" },
]);

onMounted(() => {
  if (isImage.value || !editorRef.value) return;

  socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

  const customTheme = EditorView.theme({
    "&": { 
      height: "100%", 
      backgroundColor: "transparent",
      fontFamily: "'JetBrains Mono', monospace"
    },
    ".cm-scroller": { 
      overflow: "auto", 
      paddingBottom: "80px" 
    },
    ".cm-gutters": { 
      backgroundColor: "transparent !important", 
      color: "rgba(255,255,255,0.2)", 
      border: "none",
      minWidth: "0 !important",
    },
    ".cm-gutter": {
      minWidth: "0 !important",
    },
    ".cm-lineNumbers": {
      minWidth: "0 !important",
      flexShrink: 0
    },
    ".cm-foldPlaceholder": {
        backgroundColor: "rgba(255, 255, 255, 0.1) !important",
        color: "#ccc !important",
        border: "1px solid rgba(255, 255, 255, 0.1) !important",
        letterSpacing: "1.5px",
        borderRadius: "4px",
        padding: "0 5px"
    },
    ".cm-gutterElement": {
        minWidth: "0 !important", 
        width: "auto !important", 
        display: "flex !important",
        textAlign: "left",
        justifyContent: "flex-start",
        borderTopLeftRadius: "6px",
        borderBottomLeftRadius: "6px",
        marginLeft: "10px",
    },
    ".cm-gutter.cm-foldGutter .cm-gutterElement": {
        borderTopLeftRadius: "0px",
        borderBottomLeftRadius: "0px",
        borderTopRightRadius: "6px",
        borderBottomRightRadius: "6px",
        marginLeft: "0px",
    },
    ".cm-content": { 
        paddingTop: "20px !important",
        paddingBottom: "20px !important",
        color: "#ccc",
        whiteSpace: "pre !important"
    },
    ".cm-line": { padding: "0 0 0 6px !important", borderRadius: "6px", margin: "0 0 0 10px !important" },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.03)" },
    ".cm-cursor": { borderLeft: "2px solid #48dbfb" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "rgba(64,224,208,0.2) !important" }
  }, { dark: true });

  const state = EditorState.create({
    doc: props.content,
    extensions: [
      basicSetup,
      getLanguage(),
      syntaxHighlighting(myHighlightStyle),
      customTheme,
      remoteSelectionsField,
      fontConfig.of(getFontTheme(fontSize.value)),
      readOnlyConfig.of(EditorState.readOnly.of(props.isReadOnly)),
      EditorView.domEventHandlers({
        blur: () => {
          socket?.send(JSON.stringify({ type: 'selection', path: props.path, sessionId, active: false }));
        },
        focus: () => {
          if (view) {
            const { anchor, head } = view.state.selection.main;
            socket?.send(JSON.stringify({ type: 'selection', path: props.path, anchor, head, sessionId, username: username.value, avatar, color: userColor.value, active: true }));
          }
        }
      }),
      EditorView.updateListener.of(u => {
        if (u.docChanged) {
          emit('update:content', u.state.doc.toString());
        }
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        if (u.docChanged && !u.transactions.some(tr => tr.annotation(Transaction.remote))) {
          socket.send(JSON.stringify({
            type: 'edit', path: props.path, content: u.state.doc.toString(), sessionId
          }));
        }
        if (u.selectionSet && !u.transactions.some(tr => tr.annotation(Transaction.remote)) && view?.hasFocus) {
          const { anchor, head } = u.state.selection.main;
          socket.send(JSON.stringify({
            type: 'selection', path: props.path, anchor, head, sessionId, username: username.value, avatar, color: userColor.value, active: true
          }));
        }
      }),
      keymap.of([indentWithTab])
    ]
  });

  view = new EditorView({ state, parent: editorRef.value });

  socket.onopen = () => {
    socket?.send(JSON.stringify({ 
      type: 'join', 
      path: props.path, 
      sessionId: sessionId,
      username: username.value,
      avatar: avatar,
      color: userColor.value
    }));
  };

socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.path !== props.path || data.sessionId === sessionId || !view) return;
      
      if (data.type === 'edit') {
        const currentContent = view.state.doc.toString();
        if (data.content !== currentContent) {
          view.dispatch({
            changes: { from: 0, to: currentContent.length, insert: data.content },
            annotations: Transaction.remote.of(true)
          });
        }
        } else if (data.type === 'selection') {
        if (data.active === false) {
          view.dispatch({
            effects: removeRemoteSelection.of(data.sessionId),
            annotations: Transaction.remote.of(true)
          });
          return;
        }

        const color = data.color || userColors.get(data.sessionId) || '#40E0D0';
        if (data.color) userColors.set(data.sessionId, data.color);

        const docLen = view.state.doc.length;
        const anchor = Math.max(0, Math.min(data.anchor ?? 0, docLen));
        const head = Math.max(0, Math.min(data.head ?? 0, docLen));

        view.dispatch({
          effects: updateRemoteSelection.of({
            id: data.sessionId, 
            name: data.username || 'Anonymous', 
            anchor, 
            head, 
            color
          }),
          annotations: Transaction.remote.of(true)
        });
        
        const applySelection = (color: string) => {
          view?.dispatch({
            effects: updateRemoteSelection.of({
              id: data.sessionId, name: data.username, anchor: data.anchor, head: data.head, color
            }),
            annotations: Transaction.remote.of(true)
          });
        };

        if (data.color) {
          userColors.set(data.sessionId, data.color);
          applySelection(data.color);
        } else if (!userColors.has(data.sessionId)) {
          getAverageColor(data.avatar).then(color => {
            userColors.set(data.sessionId, color);
            applySelection(color);
          });
        } else {
          applySelection(userColors.get(data.sessionId)!);
        }
      } else if (data.type === 'leave') {
        view.dispatch({
          effects: removeRemoteSelection.of(data.sessionId),
          annotations: Transaction.remote.of(true)
        });
      } else if (data.type === 'save') {
        emit('remote-save', data.path);
      }
    } catch (e) {}
  };

  (window as any)._currentEditorSocket = socket;
  (window as any)._currentEditorSessionId = sessionId;
});

watch(() => userCookie.value?.color, (newColor) => {
  if (newColor && socket && socket.readyState === WebSocket.OPEN && view) {
    const { anchor, head } = view.state.selection.main;
    const msg = {
      type: 'selection',
      path: props.path,
      anchor,
      head,
      sessionId,
      username: username.value,
      avatar,
      color: newColor
    };
    socket.send(JSON.stringify(msg));
    socket.send(JSON.stringify({
      type: 'user-update',
      path: props.path,
      sessionId,
      username: username.value,
      avatar: avatar,
      color: newColor
    }));
  }
});

const checkBounds = () => {
  if (!imgElement.value) return;
  const container = imgElement.value.parentElement;
  if (!container) return;
  const margin = 300 + (imgScale.value * 40);
  const cW = container.clientWidth;
  const cH = container.clientHeight;
  const iW = imgElement.value.offsetWidth * imgScale.value;
  const iH = imgElement.value.offsetHeight * imgScale.value;
  let targetX = imgX.value;
  let targetY = imgY.value;
  if (iW <= cW) {
    if (targetX > margin) targetX = margin;
    if (targetX < -margin) targetX = -margin;
  } else {
    const limitX = (iW - cW) / 2 + margin;
    if (targetX > limitX) targetX = limitX;
    if (targetX < -limitX) targetX = -limitX;
  }
  if (iH <= cH) {
    if (targetY > margin) targetY = margin;
    if (targetY < -margin) targetY = -margin;
  } else {
    const limitY = (iH - cH) / 2 + margin;
    if (targetY > limitY) targetY = limitY;
    if (targetY < -limitY) targetY = -limitY;
  }
  imgX.value = targetX;
  imgY.value = targetY;
};

const handleZoom = (e: WheelEvent) => {
  if (isImage.value || isAudio.value || isVideo.value) return;
  let percent = currentZoomPercent.value + (e.deltaY < 0 ? 5 : -5);
  percent = Math.max(40, Math.min(percent, 400));
  fontSize.value = (percent / 100) * 14;
  if (view) view.dispatch({ effects: fontConfig.reconfigure(getFontTheme(fontSize.value)) });
  showZoomIndicator.value = true;
  clearTimeout(zoomTimeout);
  zoomTimeout = setTimeout(() => showZoomIndicator.value = false, 1500);
};

const saveFile = async () => {
  const tab = activeTab.value;
  if (!tab || tab.isReadOnly || !tab.isDirty || isSaving.value) return;
  isSaving.value = true;
  try {
    await $fetch('/api/content', { method: 'POST', body: { path: tab.path, content: tab.content } });
    tab.originalContent = tab.content;
    tab.isDirty = false;
    
    const ws = (window as any)._currentEditorSocket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const cleanPath = (tab.path || '').replace(/^\/|\/$/g, '');
      ws.send(JSON.stringify({
        type: 'save',
        path: cleanPath,
        sessionId: (window as any)._currentEditorSessionId
      }));
    }
  } catch (e) { 
    alert('Save failed'); 
  } finally { 
    isSaving.value = false; 
  }
};

const isImage = computed(() => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(props.fileName.split('.').pop()?.toLowerCase() || ''));
const isAudio = computed(() => ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(props.fileName.split('.').pop()?.toLowerCase() || ''));
const isVideo = computed(() => ['mp4', 'webm', 'ogv', 'mov', 'mkv'].includes(props.fileName.split('.').pop()?.toLowerCase() || ''));

onUnmounted(() => {
  if (view) view.destroy();
  if (socket) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({
          type: 'leave',
          path: props.path,
          sessionId: sessionId
        }));
      } catch (e) {}
      socket.close();
    } else if (socket.readyState === WebSocket.CONNECTING) {
      const socketToClose = socket;
      socketToClose.onopen = () => socketToClose.close();
    }
  }
  if ((window as any)._currentEditorSocket === socket) {
    (window as any)._currentEditorSocket = null;
  }
});

watch(() => props.content, (newVal) => {
  if (isImage.value) { 
    imgX.value = 0; 
    imgY.value = 0; 
    imgScale.value = 1; 
  }
  if (view && !view.hasFocus && newVal !== view.state.doc.toString()) {
    view.dispatch({ 
      changes: { from: 0, to: view.state.doc.length, insert: newVal },
      annotations: Transaction.remote.of(true)
    });
  }
});

watch(() => props.isReadOnly, (newVal) => {
  if (view) view.dispatch({ effects: readOnlyConfig.reconfigure(EditorState.readOnly.of(newVal)) });
});
</script>

<style scoped>
:deep(.cm-editor) { height: 100%; outline: none !important; animation: rainbow-cycle 3s linear infinite; }
:deep(.cm-scroller::-webkit-scrollbar) { width: 8px; height: 8px; }
:deep(.cm-scroller::-webkit-scrollbar-thumb) { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
img { image-rendering: pixelated; image-rendering: crisp-edges; }
:deep(.cm-scroller::-webkit-scrollbar-thumb:hover) { background: rgba(255, 255, 255, 0.2); }
.zoom-fade-enter-active, .zoom-fade-leave-active { transition: all 0.2s ease; }
.zoom-fade-enter-from, .zoom-fade-leave-to { opacity: 0; transform: scale(0.95); }

@property --rainbow-hue {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: true;
}

@keyframes rainbow-cycle {
  from { --rainbow-hue: 0deg; }
  to { --rainbow-hue: 360deg; }
}

@keyframes remote-cursor-blink {
  0%, 100% { border-left-color: var(--cursor-color); }
  50% { border-left-color: transparent; }
}

:deep(.cm-remote-cursor) {
  border-left: 2px solid var(--cursor-color);
  animation: remote-cursor-blink 1s step-end infinite;
}

:deep(.cm-remote-cursor.rainbow) {
  --cursor-color: hsl(var(--rainbow-hue), 100%, 50%);
}

:deep(.cm-remote-cursor.rainbow .cm-remote-cursor-label) {
  background-color: hsl(var(--rainbow-hue), 100%, 50%) !important;
}

:deep(.cm-remote-selection.rainbow-selection) {
  background-color: hsla(var(--rainbow-hue), 100%, 50%, 0.25) !important;
}
</style>