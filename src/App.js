import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Table from './Table';
import TablePage from './TablePage';
import UnpaidTablePage from './UnpaidTablePage';
import OrderDetail from './OrderDetail';
import takeout from './takeout';


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Table />} />
        <Route path="/tablePage/:id" element={<TablePage />} />
        <Route path="/unpaid" element={<UnpaidTablePage />} />
        <Route path="/orderdetail" element={<OrderDetail />} />
        <Route path="/orderdetail/:orderIndex" element={<OrderDetail />} />
        <Route path="/takeout" element={<takeout />} />
      </Routes>
    </Router>
  );
}
