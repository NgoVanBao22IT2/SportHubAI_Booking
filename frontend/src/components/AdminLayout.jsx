
import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AdminLayout = () => (
    <div className="layout admin-layout">
        <header style={{ background: '#7f1d1d', color: 'white' }}>
            <nav>
                <Link to="/admin/dashboard" style={{ color: 'white' }}>Dashboard</Link> | 
                <Link to="/admin/users" style={{ color: 'white' }}>Users</Link> | 
                <Link to="/admin/owners" style={{ color: 'white' }}>Owners</Link> | 
                <Link to="/admin/venues" style={{ color: 'white' }}>Venues</Link> | 
                <Link to="/admin/bookings" style={{ color: 'white' }}>Bookings</Link> | 
                <Link to="/admin/payments" style={{ color: 'white' }}>Payments</Link> | 
                <Link to="/admin/reviews" style={{ color: 'white' }}>Reviews</Link> | 
                <Link to="/admin/reports" style={{ color: 'white' }}>Reports</Link>
            </nav>
        </header>
        <main>
            <Outlet />
        </main>
    </div>
);

export default AdminLayout;
