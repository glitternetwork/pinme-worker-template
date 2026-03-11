import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { getApiUrl } from '../../utils/api';

interface RootDomainData {
  code: number;
  msg: string;
  data?: {
    domain: string;
  };
}

export default function Demo() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RootDomainData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchRootDomain() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/root-domain'));
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Request failed, please try again later');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRootDomain();
  }, []);

  return (
    <div className="page">
      <Header />

      <main>
        <section className="demo">
          <h2>API Demo</h2>
          <p className="desc">
            Example: Call Pinme API to get user's Root Domain
          </p>

          <div className="api-box">
            <div className="api-method">GET</div>
            <div className="api-url">/api/root-domain</div>
          </div>

          <button 
            className="btn-fetch" 
            onClick={fetchRootDomain}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Fetch Again'}
          </button>

          {error && (
            <div className="result error">{error}</div>
          )}

          {result && (
            <div className="result">
              <h3>Response:</h3>
              <pre>{JSON.stringify(result, null, 2)}</pre>
              {result.data?.domain && (
                <div className="domain-result">
                  <span>Your Root Domain: </span>
                  <a 
                    href={`https://${result.data.domain}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {result.data.domain} -&gt;
                  </a>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
