import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="bg-primary text-white w-full h-16 flex items-center justify-center sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between">
        {/* Logo & Main Nav */}
        <div className="flex items-center space-x-10">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center text-primary font-bold italic text-xl">S</div>
            <span className="font-bold text-xl tracking-tight">SportHubAI</span>
          </Link>
          <nav className="hidden md:flex space-x-6 text-sm font-medium">
            <Link to="/" className="hover:text-green-200 border-b-2 border-white pb-1">Trang chủ</Link>
            <Link to="/search" className="hover:text-green-200 pb-1">Đặt sân</Link>
            <Link to="/matches" className="hover:text-green-200 pb-1">Trận đấu</Link>
            <Link to="/leaderboard" className="hover:text-green-200 pb-1">Bảng xếp hạng</Link>
            <Link to="/management" className="hover:text-green-200 pb-1">Quản lý</Link>
          </nav>
        </div>

        {/* Auth & Actions */}
        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-sm font-medium hover:text-green-200 border border-white/50 px-4 py-1.5 rounded-full">
            Đăng nhập
          </Link>
          <Link to="/register" className="text-sm font-medium bg-orange-500 hover:bg-orange-600 px-4 py-1.5 rounded-full text-white transition-colors">
            Đăng ký
          </Link>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative" title="Tính năng thông báo sắp ra mắt">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
