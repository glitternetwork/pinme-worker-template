import Header from '../../components/Header';

export default function About() {
  return (
    <div className="page">
      <Header />

      <main>
        <section className="about">
          <h2>About Pinme</h2>
          <p>
            Pinme is an all-in-one full-stack deployment tool that combines decentralized static hosting (IPFS) with serverless backend (Cloudflare Workers + D1 database).
          </p>
          
          <h3>Core Features</h3>
          <ul>
            <li><code>pinme upload</code> - Frontend static files -&gt IPFS, permanently accessible</li>
            <li><code>pinme worker deploy</code> - Backend Worker -&gt {`{name}.pinme.pro`}</li>
            <li><code>pinme db migrate</code> - SQL migration files -&gt D1 database</li>
          </ul>

          <h3>Tech Stack</h3>
          <ul>
            <li>Frontend: React + TypeScript + Vite</li>
            <li>Backend: Cloudflare Workers</li>
            <li>Database: Cloudflare D1 (SQLite)</li>
            <li>Deployment: Pinme (IPFS + Workers)</li>
          </ul>

          <div className="links">
            <a href="https://pinme.eth.limo" target="_blank" rel="noopener noreferrer">
              Visit Pinme -&gt;
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
