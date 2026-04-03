import { useEffect, useState, type FormEvent } from 'react';
import Header from '../../components/Header';
import { API, apiFetch } from '../../utils/api';

interface RecordItem {
  id: number;
  content: string;
  created_at: string;
}

interface RecordsResponse {
  data?: RecordItem[];
  source?: string;
  error?: string;
}

interface RecordResponse {
  data?: RecordItem;
  source?: string;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  source?: string;
  error?: string;
}

export default function Records() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [source, setSource] = useState('');
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRecords();
  }, []);

  async function fetchRecords() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/records');
      const result = await response.json() as RecordsResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load records');
      }

      setRecords(result.data || []);
      setSource(result.source || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      });
      const result = await response.json() as RecordResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create record');
      }

      setDraft('');
      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
      setLoading(false);
    }
  }

  function startEditing(record: RecordItem) {
    setEditingId(record.id);
    setEditDraft(record.content);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDraft('');
  }

  async function handleUpdate(recordId: number) {
    if (!editDraft.trim()) return;

    setSavingId(recordId);
    setError(null);

    try {
      const response = await apiFetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editDraft }),
      });
      const result = await response.json() as RecordResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update record');
      }

      cancelEditing();
      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(recordId: number) {
    if (!window.confirm('Delete this record?')) return;

    setDeletingId(recordId);
    setError(null);

    try {
      const response = await apiFetch(`/api/records/${recordId}`, {
        method: 'DELETE',
      });
      const result = await response.json() as DeleteResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete record');
      }

      if (editingId === recordId) {
        cancelEditing();
      }

      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page">
      <Header />

      <main>
        <section className="api-info">
          <code>API: {API || 'same origin'}</code>
        </section>

        <section className="records-hero">
          <div>
            <h2>Record Manager</h2>
            <p>Simple CRUD demo for inserting, reading, updating, and deleting database records.</p>
          </div>

          <button type="button" className="btn-secondary" onClick={() => void fetchRecords()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </section>

        <form onSubmit={handleCreate} className="record-form">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a new record..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !draft.trim()}>
            {loading ? 'Saving...' : 'Insert'}
          </button>
        </form>

        {error && <div className="status error">{error}</div>}

        <section className="records-panel">
          <div className="records-meta">
            <span>{records.length} record{records.length === 1 ? '' : 's'}</span>
            <span>Source: {source || 'unknown'}</span>
          </div>

          {records.length === 0 ? (
            <p className="empty-state">No records yet.</p>
          ) : (
            <div className="record-list">
              {records.map((record) => (
                <article key={record.id} className="record-row">
                  <div className="record-id">#{record.id}</div>

                  <div className="record-content">
                    {editingId === record.id ? (
                      <input
                        type="text"
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                        disabled={savingId === record.id}
                      />
                    ) : (
                      <p>{record.content}</p>
                    )}
                  </div>

                  <div className="record-time">
                    {new Date(record.created_at).toLocaleString()}
                  </div>

                  <div className="record-actions">
                    {editingId === record.id ? (
                      <>
                        <button
                          type="button"
                          className="btn-action"
                          onClick={() => void handleUpdate(record.id)}
                          disabled={savingId === record.id || !editDraft.trim()}
                        >
                          {savingId === record.id ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={cancelEditing}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn-action"
                          onClick={() => startEditing(record)}
                          disabled={deletingId === record.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => void handleDelete(record.id)}
                          disabled={deletingId === record.id}
                        >
                          {deletingId === record.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
