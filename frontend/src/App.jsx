import { Routes, Route } from 'react-router-dom';
import CustomerLayout from './components/CustomerLayout';
import HomePage from './pages/customer/HomePage';
import VenueDetail from './pages/customer/VenueDetail';
import Search from './pages/Search';
import Booking from './pages/Booking';
import Checkout from './pages/Checkout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<Search />} />
        <Route path="venues/:id" element={<VenueDetail />} />
        <Route path="booking" element={<Booking />} />
        <Route path="checkout" element={<Checkout />} />
      </Route>
    </Routes>
  );
}

export default App;
