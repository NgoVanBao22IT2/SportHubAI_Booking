import React from 'react';
import { X, Calendar, Ticket, ChevronRight, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

/**
 * STEP 2 - CHỌN HÌNH THỨC ĐẶT MODAL
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onSelectVisualBooking
 * @param {Object} [props.venue]
 */
export default function BookingModal({ isOpen, onClose, onSelectVisualBooking, venue }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border-subtle-medium overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle-medium bg-surface-subtle">
          <div>
            <span className="text-xs font-semibold tracking-wider text-brand-orange uppercase">SportHubAI Booking</span>
            <h2 className="text-xl font-bold text-gray-900">CHỌN HÌNH THỨC ĐẶT</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-gray-900 rounded-full hover:bg-surface transition-colors"
            aria-label="Đóng modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Options */}
        <div className="p-6 space-y-4">
          
          {/* OPTION 1: ĐẶT LỊCH THEO SÂN - TRỰC QUAN */}
          <Card
            radius="xl"
            padding="lg"
            className="border-2 border-brand-orange bg-brand-orange/5 hover:bg-brand-orange/10 transition-all cursor-pointer group relative overflow-hidden"
            onClick={onSelectVisualBooking}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-orange text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <Calendar size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-base group-hover:text-brand-orange transition-colors">
                    ĐẶT LỊCH THEO SÂN - TRỰC QUAN
                  </h3>
                  <Badge variant="primary" size="sm">
                    Khuyên dùng
                  </Badge>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Đặt lịch theo sân trên bảng trạng thái sân, có thể lựa chọn nhiều khung giờ và nhiều sân cùng lúc.
                </p>
              </div>
              <ChevronRight size={20} className="text-brand-orange mt-1 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="mt-4 pt-3 border-t border-brand-orange/20 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ChevronRight size={16} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectVisualBooking();
                }}
              >
                Tiếp tục
              </Button>
            </div>
          </Card>

          {/* OPTION 2: MUA VÉ SOCIAL */}
          <Card
            radius="xl"
            padding="lg"
            className="border border-border-subtle-medium bg-surface-subtle opacity-70 relative cursor-not-allowed select-none"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200 text-gray-500 flex items-center justify-center flex-shrink-0">
                <Ticket size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-700 text-base">
                    MUA VÉ SOCIAL
                  </h3>
                  <Badge variant="secondary" size="sm" leftIcon={<Sparkles size={12} />}>
                    Sắp ra mắt
                  </Badge>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Tham gia các trận giao lưu ghép sân social ticket dành cho cá nhân và nhóm thể thao.
                </p>
              </div>
            </div>
          </Card>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-surface-subtle border-t border-border-subtle-medium flex justify-between items-center text-xs text-text-muted">
          <span>{venue ? venue.venue_name : 'SportHubAI Platform'}</span>
          <span>Bảo mật & Giữ chỗ 100%</span>
        </div>

      </div>
    </div>
  );
}
