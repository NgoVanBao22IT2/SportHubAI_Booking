import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps routes that require authentication and role authorization.
 * Redirects unauthenticated users to /login and renders 403 for unauthorized roles.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 1. Wait for session hydration before making redirect decision
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-brand-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-text-muted text-sm font-medium">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  // 2. Redirect unauthenticated user to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 3. Check role authorization (if allowedRoles prop is specified)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (currentUser?.primary_role || currentUser?.role || '').toUpperCase();
    const authorized = allowedRoles.some(r => r.toUpperCase() === userRole);

    if (!authorized) {
      return (
        <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface p-8 rounded-2xl border border-border-subtle-medium shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center text-2xl font-bold border-2 border-red-300">
              403
            </div>
            <h1 className="text-xl font-bold text-gray-900">Không có quyền truy cập</h1>
            <p className="text-xs text-text-muted">
              Bạn không có quyền truy cập khu vực Chủ sân. Vui lòng đăng nhập bằng tài khoản có quyền Chủ sân (OWNER) hoặc Quản trị viên (ADMIN).
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href="/"
                className="w-full py-2.5 px-4 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs rounded-xl text-center transition-colors shadow-xs"
              >
                Quay lại trang chủ
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
}
