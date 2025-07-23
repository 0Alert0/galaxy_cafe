import { Routes, Route } from 'react-router-dom';
import React from 'react';
import Table from './Table';
import TablePage from './TablePage';
import UnpaidTablePage from './UnpaidTablePage';
import OrderDetail from './OrderDetail';
import Takeout from './takeout';
import Report from './Report';



export default function App() {
  return (
    
      <Routes>
        <Route path="/" element={<Table />} />
        <Route path="/tablePage/:id" element={<TablePage />} />
        <Route path="/unpaid" element={<UnpaidTablePage />} />
        <Route path="/orderdetail" element={<OrderDetail />} />
        <Route path="/orderdetail/:orderIndex" element={<OrderDetail />} />
        <Route path="/takeout" element={<Takeout/>} />
        <Route path="/report" element={<Report />} />
      </Routes>
    
  );
}
