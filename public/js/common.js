'use strict';
/* أدوات مشتركة */
window.SV = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  function fmtBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
    let u = -1;
    do { n /= 1024; u++; } while (n >= 1024 && u < units.length - 1);
    return n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2) + ' ' + units[u];
  }

  function timeAgo(ts) {
    if (!ts) return 'لم يتصل بعد';
    const diff = Math.floor(Date.now() / 1000) - Number(ts);
    if (diff < 10) return 'الآن';
    if (diff < 60) return 'منذ ' + diff + ' ثانية';
    if (diff < 3600) return 'منذ ' + Math.floor(diff / 60) + ' دقيقة';
    if (diff < 86400) return 'منذ ' + Math.floor(diff / 3600) + ' ساعة';
    return 'منذ ' + Math.floor(diff / 86400) + ' يوم';
  }

  function fmtUptime(sec) {
    sec = Number(sec) || 0;
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    if (d) return `${d} يوم ${h} س`;
    if (h) return `${h} س ${m} د`;
    return `${m} دقيقة`;
  }

  function toast(msg, type = '') {
    const root = $('#toastRoot');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .4s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 400);
    }, 3200);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('تم النسخ ✓', 'ok');
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast('تم النسخ ✓', 'ok'); }
      catch { toast('تعذر النسخ — انسخ يدويًا', 'err'); }
      ta.remove();
      return true;
    }
  }

  function download(filename, text, mime = 'text/plain') {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const TOKEN_KEY = 'sv_token';
  const token = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

  async function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (opts.body && typeof opts.body === 'object') {
      headers['Content-Type'] = 'application/json';
      opts = { ...opts, body: JSON.stringify(opts.body) };
    }
    const t = token();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    const res = await fetch('/api' + path, opts);
    if (res.status === 401 && path !== '/login') {
      setToken(null);
      window.dispatchEvent(new CustomEvent('sv:unauthorized'));
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'حدث خطأ غير متوقع');
    return data;
  }

  return { $, $$, esc, fmtBytes, timeAgo, fmtUptime, toast, copy, download, token, setToken, api };
})();
