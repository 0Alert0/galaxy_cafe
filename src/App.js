import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Table from './src/Table';
import TablePage from './src/TablePage';
import UnpaidTablePage from './src/UnpaidTablePage';
import OrderDetail from './src/OrderDetail';
import Takeout from './src/Takeout';


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Table />} />
        <Route path="/tablePage/:id" element={<TablePage />} />
        <Route path="/unpaid" element={<UnpaidTablePage />} />
        <Route path="/orderdetail" element={<OrderDetail />} />
        <Route path="/orderdetail/:orderIndex" element={<OrderDetail />} />
        <Route path="/takeout" element={<Takeout />} />
      </Routes>
    </Router>
  );
}
