const buffers = new Map<string, string>();
const peers = new Map<any, { path: string, sessionId: string, username: string, avatar: string, isViewer: boolean, color: string }>();

function broadcastToAll(message: string, skipPeer?: any) {
  try {
    const msgObj = JSON.parse(message);
    const targetPath = msgObj.path;

    for (const [peer, info] of peers.entries()) {
      if (peer === skipPeer) continue;

      if (targetPath && info.path !== targetPath && msgObj.type !== 'file-change') {
        continue;
      }

      try {
        peer.send(message);
      } catch (e) {
        peers.delete(peer);
      }
    }
  } catch (e) {}
}

function broadcastPresence(path: string) {
  const usersOnPath = [];
  for (const info of peers.values()) {
    if (info.path === path) {
      usersOnPath.push({
        sessionId: info.sessionId,
        username: info.username,
        avatar: info.avatar,
        isViewer: info.isViewer,
        color: info.color
      });
    }
  }
  const message = JSON.stringify({ type: 'presence', path, users: usersOnPath });
  broadcastToAll(message);
}

export default defineWebSocketHandler({
  open(peer) {
    peers.set(peer, { path: '', sessionId: '', username: '', avatar: '', isViewer: true, color: '' });
  },
  message(peer, message) {
    try {
      const text = message.text();
      const data = JSON.parse(text);
      if (!data) return;

      if (data.type === 'join') {
        const info = peers.get(peer);
        const oldPath = info?.path;
        peers.set(peer, { 
          path: data.path || '', 
          sessionId: data.sessionId || 'anon', 
          username: data.username || 'Anonymous', 
          avatar: data.avatar || '',
          isViewer: !!data.isViewer,
          color: data.color || '#40E0D0'
        });
        if (oldPath && oldPath !== data.path) broadcastPresence(oldPath);
        broadcastPresence(data.path || '');

        const allPresence: Record<string, any[]> = {};
        for (const p of peers.values()) {
          if (p.path && !p.isViewer) {
            if (!allPresence[p.path]) allPresence[p.path] = [];
            allPresence[p.path].push({
              sessionId: p.sessionId,
              username: p.username,
              avatar: p.avatar,
              color: p.color
            });
          }
        }
        peer.send(JSON.stringify({ type: 'presence-sync', allPresence }));
      } else if (data.type === 'file-change') {
        broadcastToAll(text, peer);
      } else if (data.type === 'save') {
        broadcastToAll(text, peer);
      } else if (data.type === 'edit' || data.type === 'selection' || data.type === 'save' || data.type === 'user-update') {
        if (data.type === 'edit' && data.path) buffers.set(data.path, data.content);
        broadcastToAll(text, peer);
      }
    } catch (e) {
    }
  },
  close(peer) {
    const info = peers.get(peer);
    if (info) {
      const path = info.path;
      peers.delete(peer);
      broadcastPresence(path);
    }
  }
});