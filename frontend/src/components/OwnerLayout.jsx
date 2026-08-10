
import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const OwnerLayout = () => (
    <div className="layout owner-layout">
        <header style={{ background: '#1e293b' }}>
            <nav>
                <Link to="/owner/dashboard">Dashboard</Link> | 
                <Link to="/owner/venues">Venues</Link> | 
                <Link to="/owner/branches">Branches</Link> | 
                <Link to="/owner/courts">Courts</Link> | 
                <Link to="/owner/schedules">Schedules</Link> | 
                <Link to="/owner/bookings">Bookings</Link> | 
                <Link to="/owner/customers">Customers</Link> | 
                <Link to="/owner/revenue">Revenue</Link>
            </nav>
        </header>
        <main>
            <Outlet />
        </main>
    </div>
);

export default OwnerLayout;
