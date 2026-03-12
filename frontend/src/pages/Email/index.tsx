import { useState } from 'react';
import Header from '../../components/Header';

export default function Email() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!to || !subject || !html) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, html }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Failed to send email request');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <Header />

      <main>
        <section className="email">
          <h2>Send Email</h2>
          <p className="desc">
            Send email via Pinme API (api prefix: https://pinme.dev/api/v4/)
          </p>

          <form onSubmit={handleSubmit} className="email-form">
            <div className="form-group">
              <label htmlFor="to">To (Email):</label>
              <input
                id="to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="user@example.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject:</label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="html">HTML Content:</label>
              <textarea
                id="html"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="<p>Your HTML content here...</p>"
                rows={6}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </form>

          {error && (
            <div className="result error">{error}</div>
          )}

          {result && (
            <div className="result">
              <h3>Response:</h3>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
