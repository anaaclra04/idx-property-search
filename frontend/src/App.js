import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ListingsPage from './pages/ListingsPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import ErrorBoundary from './components/ErrorBoundary';
import { useFavorites } from './hooks/useFavorites';
import './App.css';

function AppHeader() {
  const { count } = useFavorites();
  return (
    <header className="App-header-simple">
      <h1>Property Search</h1>
      <nav className="App-nav">
        <NavLink to="/" end>Listings</NavLink>
        <NavLink to="/favorites">Favorites {count > 0 && `(${count})`}</NavLink>
      </nav>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <AppHeader />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<ListingsPage />} />
            <Route path="/property/:id" element={<PropertyDetailPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}

export default App;