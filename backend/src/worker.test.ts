import { beforeEach, describe, expect, it, vi } from 'vitest';

type WorkerModule = {
  fetch(request: Request, env: Record<string, unknown>): Promise<Response>;
};

let worker: WorkerModule;

async function loadWorker() {
  vi.resetModules();
  ({ default: worker } = await import('./worker'));
}

async function callApi(path: string, init?: RequestInit) {
  const response = await worker.fetch(new Request(`http://local.test${path}`, init), {});
  const body = await response.json();
  return { response, body };
}

describe('records api', () => {
  beforeEach(async () => {
    await loadWorker();
  });

  it('returns an empty records list', async () => {
    const { response, body } = await callApi('/api/records');

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.source).toBe('memory');
  });

  it('creates and lists a record', async () => {
    const created = await callApi('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'First record' }),
    });

    expect(created.response.status).toBe(201);
    expect(created.body.data.content).toBe('First record');

    const listed = await callApi('/api/records');

    expect(listed.response.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].content).toBe('First record');
  });

  it('updates an existing record', async () => {
    const created = await callApi('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Draft record' }),
    });

    const updated = await callApi(`/api/records/${created.body.data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Updated record' }),
    });

    expect(updated.response.status).toBe(200);
    expect(updated.body.data.content).toBe('Updated record');
  });

  it('deletes a record', async () => {
    const created = await callApi('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Disposable record' }),
    });

    const removed = await callApi(`/api/records/${created.body.data.id}`, {
      method: 'DELETE',
    });

    expect(removed.response.status).toBe(200);
    expect(removed.body.success).toBe(true);

    const listed = await callApi('/api/records');

    expect(listed.body.data).toEqual([]);
  });
});
