/* CAOS IMOBILIÁRIO — transporte WebSocket do cliente (reconexão automática) */
(function (global) {
'use strict';
class Net {
  constructor() { this.ws = null; this.handlers = {}; this.url = null; this.session = null; this.tries = 0; this.closedByUser = false; }
  on(t, fn) { (this.handlers[t] = this.handlers[t] || []).push(fn); return this; }
  emit(t, msg) { (this.handlers[t] || []).forEach((fn) => { try { fn(msg); } catch (e) { console.error('handler', t, e); } }); }
  static defaultUrl() {
    const cfg = (global.CAOS_CONFIG || {}).serverUrl; if (cfg) return cfg;
    if (location.protocol === 'http:' || location.protocol === 'https:') return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
    return localStorage.getItem('caos_server_url') || 'ws://localhost:8080';
  }
  connect(url) {
    this.url = url; this.closedByUser = false;
    return new Promise((resolve, reject) => {
      let settled = false; const ws = new WebSocket(url); this.ws = ws;
      ws.onopen = () => { this.tries = 0; settled = true; this.emit('open'); resolve(); if (this.session) ws.send(JSON.stringify({ t: 'reconnect', ...this.session })); };
      ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } this.emit('*', m); this.emit(m.t, m); };
      ws.onerror = () => { if (!settled) { settled = true; reject(new Error('Não consegui conectar em ' + url)); } };
      ws.onclose = () => { this.emit('close'); if (this.closedByUser || !this.session) return; const wait = Math.min(8000, 800 * Math.pow(1.6, this.tries++)); this.emit('reconnecting', { wait }); setTimeout(() => this.connect(url).catch(() => {}), wait); };
    });
  }
  send(msg) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg)); }
  close() { this.closedByUser = true; this.session = null; if (this.ws) this.ws.close(); }
  saveSession(code, token) { this.session = { code, token }; localStorage.setItem('caos_online_session', JSON.stringify({ code, token, url: this.url, t: Date.now() })); }
  static savedSession() { try { const s = JSON.parse(localStorage.getItem('caos_online_session') || 'null'); return s && Date.now() - s.t < 12 * 60 * 1000 ? s : null; } catch (e) { return null; } }
  static clearSession() { localStorage.removeItem('caos_online_session'); }
}
global.CaosNet = Net;
})(window);
