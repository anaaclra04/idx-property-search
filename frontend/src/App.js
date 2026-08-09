import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ListingsPage from './components/ListingsPage';
import PropertyDetailPage from './components/PropertyDetailPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
       <header className="App-header-simple">
         <h1>Property Search</h1>
       </header>
       <Routes>
          <Route path="/" element={<ListingsPage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
       </Routes>
     </div>
    </BrowserRouter>
    
  );
}

export default App;