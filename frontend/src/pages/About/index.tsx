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
            <li><code>pinme create</code> - Create a full-stack project from the Pinme template</li>
            <li><code>pinme save</code> - Deploy frontend, backend, and database updates in one command</li>
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
