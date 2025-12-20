import { ref, onUnmounted } from 'vue';
import type { WsMessage } from '../../types/game';

const socket = ref<WebSocket | null>(null);
const isConnected = ref(false);
const messageQueue: WsMessage[] = []; // Queue for messages before connection
let reconnectTimer: any = null;

export const useGameSocket = () => {
  const initSocket = (onMessage: (data: any) => void) => {
    // If already connected, do nothing
    if (socket.value?.readyState === WebSocket.OPEN) return;
    
    // Clear any existing reconnect timer
    if (reconnectTimer) clearTimeout(reconnectTimer);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use proper Nuxt WS url construction if needed, but relative works
    const wsUrl = `${protocol}//${window.location.host}/_ws`;

    console.log('[WS] Connecting to', wsUrl);
    socket.value = new WebSocket(wsUrl);

    socket.value.onopen = () => {
      console.log('[WS] Open');
      isConnected.value = true;
      // Flush queue
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (msg) send(msg);
      }
    };

    socket.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('[WS] Parse error', e);
      }
    };

    socket.value.onclose = () => {
      console.log('[WS] Close');
      isConnected.value = false;
      socket.value = null;
      // Reconnect after delay
      reconnectTimer = setTimeout(() => initSocket(onMessage), 3000);
    };
    
    socket.value.onerror = (e) => {
      console.error('[WS] Error', e);
    };
  };

  const send = (msg: WsMessage) => {
    if (socket.value && socket.value.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify(msg));
    } else {
      console.warn('[WS] Queuing message', msg.type);
      messageQueue.push(msg);
    }
  };

  const close = () => {
    if (socket.value) {
      socket.value.close();
      socket.value = null;
    }
    isConnected.value = false;
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };

  return {
    connect: initSocket,
    send,
    close,
    isConnected
  };
};
