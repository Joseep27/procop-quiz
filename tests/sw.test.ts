import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const home = 'https://example.com/procop-quiz/';

function bootWorker() {
 const cwd = mkdtempSync(resolve(tmpdir(), 'procop-worker-'));
 try {
  mkdirSync(resolve(cwd, 'dist/assets'), { recursive: true });
  writeFileSync(resolve(cwd, 'dist/index.html'), '<html></html>');
  execFileSync(process.execPath, [resolve('scripts/sw.mjs')], { cwd });

  const handlers = new Map<string, (event: unknown) => void>();
  const addAll = vi.fn().mockResolvedValue(undefined);
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  const claim = vi.fn().mockResolvedValue(undefined);
  const match = vi.fn();
  const fetch = vi.fn();
  const open = vi.fn().mockResolvedValue({ addAll });
  runInNewContext(readFileSync(resolve(cwd, 'dist/sw.js'), 'utf8'), {
   URL, Request, Response, fetch,
   caches: { open, match, keys: async () => [] },
   self: {
    registration: { scope: home }, clients: { claim }, skipWaiting,
    addEventListener: (type: string, handler: (event: unknown) => void) => handlers.set(type, handler),
   },
  });
  return { handlers, addAll, skipWaiting, claim, match, fetch, open };
 } finally {
  rmSync(cwd, { recursive: true, force: true });
 }
}

describe('apertura del quiz con una versión guardada', () => {
 it('activa la actualización tras guardar la nueva versión', async () => {
  const worker = bootWorker();
  const install = vi.fn();
  worker.handlers.get('install')?.({ waitUntil: install });
  await install.mock.calls[0][0];
  expect(worker.addAll.mock.calls[0][0][0]).toMatchObject({ url: home, cache: 'reload' });
  expect(worker.addAll.mock.invocationCallOrder[0]).toBeLessThan(worker.skipWaiting.mock.invocationCallOrder[0]);
  const activate = vi.fn();
  worker.handlers.get('activate')?.({ waitUntil: activate });
  await activate.mock.calls[0][0];
  expect(worker.claim).toHaveBeenCalledOnce();
 });

 it('abre la versión publicada y recurre a la copia local cuando falla la conexión', async () => {
  const { handlers, fetch, match } = bootWorker();
  const latest = new Response('actualizada');
  const offline = new Response('sin conexión');
  fetch.mockResolvedValueOnce(latest).mockRejectedValueOnce(new Error('offline'));
  match.mockResolvedValue(offline);
  const request = { method: 'GET', mode: 'navigate', url: home };
  const respondWith = vi.fn();
  handlers.get('fetch')?.({ request, respondWith });
  await expect(respondWith.mock.calls[0][0]).resolves.toBe(latest);
  expect(fetch).toHaveBeenCalledWith(request, { cache: 'no-cache' });
  expect(match).not.toHaveBeenCalled();
  handlers.get('fetch')?.({ request: { ...request, url: home + '?v=actual' }, respondWith });
  await expect(respondWith.mock.calls[1][0]).resolves.toBe(offline);
  expect(match).toHaveBeenCalledWith(home, { cacheName: expect.stringMatching(/^procop-v2-/) });
 });
});
