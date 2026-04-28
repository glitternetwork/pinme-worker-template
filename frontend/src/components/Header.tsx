import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Home' },
  { path: '/records', label: 'CRUD Demo' },
  { path: '/email', label: 'Send Email' },
  { path: '/auth', label: 'Auth Demo' },
  { path: '/about', label: 'About' },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="page-header">
      <h1>Pinme App</h1>
      <nav>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={location.pathname === item.path ? 'active' : ''}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
