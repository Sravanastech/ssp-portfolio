// Created by QAForge as a starter test: it only proves the test setup works. You can delete it.
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';

test('QAForge starter: an API answers @api', async ({ request }) => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const { port } = server.address() as AddressInfo;
  try {
    const res = await request.get(`http://127.0.0.1:${port}/`);
    expect(res.ok()).toBe(true);
    expect(await res.json()).toEqual({ ok: true });
  } finally {
    server.close();
  }
});
