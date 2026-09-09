import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './lib/session';
import { OfflineBanner } from './components/OfflineBanner';
import { Login } from './screens/Login';
import { Duty } from './screens/Duty';
import { Profile, Revenue } from './screens/Simple';
import { IconRoute, IconWallet, IconPerson } from './components/Icon';

const TABS = [
  { to: '/',        label: 'Shift',   Icon: IconRoute },
  { to: '/revenue', label: 'Revenue', Icon: IconWallet },
  { to: '/profile', label: 'Profile', Icon: IconPerson },
];

function Shell() {
  return (
    <div className="shell">
      <nav className="tabs" aria-label="Sections">
        {/* A plain anchor, not a react-router Link: the router's basename is
            /ride/ (or /drive/), so <Link to="/"> would land back on this
            app's own home tab rather than the site's front door. */}
        <a className="rail__brand" href="/">
          <span className="brand__mark">T</span>
          <span className="brand__name">Traverse</span>
        </a>
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="tab">
            <span className="tab__glyph"><Icon /></span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="shell__main">
        <Routes>
          <Route path="/" element={<Duty />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Gate() {
  const { driver } = useSession();
  return driver ? <Shell /> : <Login />;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SessionProvider>
        <OfflineBanner />
        <Gate />
      </SessionProvider>
    </BrowserRouter>
  );
}
