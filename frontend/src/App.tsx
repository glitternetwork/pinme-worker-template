import { Link } from 'react-router-dom';
import Header from './components/Header';

export default function App() {
  return (
    <div className="page">
      <Header />

      <main>
        <section className="hero">
          <h2>Welcome to Pinme</h2>
          <p>All-in-one full-stack deployment tool - frontend on IPFS, backend on Worker</p>
        </section>

        <section className="features">
          <div className="feature">
            <h3>🚀 Fast Deploy</h3>
            <p>Deploy frontend to IPFS with one command, permanently immutable</p>
          </div>
          <div className="feature">
            <h3>⚡ Lightning Fast</h3>
            <p>Cloudflare global CDN, edge computing</p>
          </div>
          <div className="feature">
            <h3>💾 Persistent Storage</h3>
            <p>D1 SQLite database, easily store data</p>
          </div>
        </section>

        <section className="cta">
          <Link to="/records" className="btn-primary">
            Open CRUD Demo -&gt;
          </Link>
        </section>
      </main>
    </div>
  );
}
