import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Records from './pages/Records';
import About from './pages/About';
import Email from './pages/Email';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/records" element={<Records />} />
        <Route path="/about" element={<About />} />
        <Route path="/email" element={<Email />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
