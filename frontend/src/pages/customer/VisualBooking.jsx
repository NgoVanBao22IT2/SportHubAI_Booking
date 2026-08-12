import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Check, 
  RefreshCw, 
  Info, 
  ShieldCheck, 
  AlertCircle,
  ChevronRight,
  Filter,
  CheckCircle2,
  Lock,
  XCircle
} from 'lucide-react';
import { getVenueById } from '../../api/venues';
import { getVenueDailyAvailability } from '../../api/availability';

// Design System Imports
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';

export default function VisualBooking() {
  const { id: venueId } = useParams();
  const navigate = useNavigate();

  // Primary Data States
  const [venue, setVenue] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [error, setError] = useState(false);

  // Filters State
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSport, setSelectedSport] = useState('ALL');

  // Selected Slots State: Map of key `${court_id}___${start_time}` -> slot detail
  const [selectedSlotsMap, setSelectedSlotsMap] = useState({});

  // 1. Generate Next 10 Days List
  const availableDates = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const isoDate = date.toISOString().split('T')[0];
      
      const dayOfWeek = date.getDay();
      const dayName = i === 0 
        ? 'Hôm nay' 
        : i === 1 
        ? 'Ngày mai' 
        : dayOfWeek === 0 
        ? 'Chủ Nhật' 
        : `Thứ ${dayOfWeek + 1}`;
      
      const dayFormatted = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      days.push({ isoDate, dayName, dayFormatted });
    }
    return days;
  }, []);

  // Set default date on load
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0].isoDate);
    }
  }, [availableDates, selectedDate]);

  // 2. Fetch Venue Basic Info
  const fetchVenueInfo = useCallback(async () => {
    if (!venueId) return;
    try {
      setLoadingVenue(true);
      setError(false);
      const data = await getVenueById(venueId);
      setVenue(data);
    } catch (err) {
      console.error("Failed to fetch venue details for booking flow", err);
      setError(true);
    } finally {
      setLoadingVenue(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchVenueInfo();
  }, [fetchVenueInfo]);

  // 3. Fetch Daily Matrix Availability when venueId or selectedDate changes
  const fetchGridAvailability = useCallback(async () => {
    if (!venueId || !selectedDate) return;
    try {
      setLoadingGrid(true);
      const res = await getVenueDailyAvailability(venueId, selectedDate);
      if (res && res.status === 'success' && res.data) {
        setAvailabilityData(res.data);
      } else {
        setAvailabilityData(null);
      }
    } catch (err) {
      console.error("Failed to fetch daily venue availability grid", err);
    } finally {
      setLoadingGrid(false);
    }
  }, [venueId, selectedDate]);

  useEffect(() => {
    fetchGridAvailability();
  }, [fetchGridAvailability]);

  // Handle Sport Category Switch
  const sportsList = useMemo(() => {
    if (!availabilityData || !availabilityData.sports) return [];
    return availabilityData.sports;
  }, [availabilityData]);

  // Filtered Courts based on selectedSport
  const filteredCourts = useMemo(() => {
    if (!availabilityData || !availabilityData.courts) return [];
    if (selectedSport === 'ALL') return availabilityData.courts;
    return availabilityData.courts.filter(c => c.sport_category === selectedSport);
  }, [availabilityData, selectedSport]);

  // Handle Slot Click Toggle Selection
  const toggleSlotSelection = (court, slot) => {
    if (slot.status !== 'AVAILABLE') return;

    const key = `${court.court_id}___${slot.start_time}`;
    setSelectedSlotsMap((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = {
          court_id: court.court_id,
          court_name: court.court_name,
          sport_category: court.sport_category,
          booking_date: selectedDate,
          start_time: slot.start_time,
          end_time: slot.end_time,
          label: slot.label,
          price: slot.price || 0
        };
      }
      return next;
    });
  };

  // Calculate Selected Summary Totals
  const selectedSlotsList = useMemo(() => Object.values(selectedSlotsMap), [selectedSlotsMap]);
  const totalSelectedCount = selectedSlotsList.length;
  const totalHours = totalSelectedCount * 1; // Assuming 1-hour slots
  const totalAmount = useMemo(() => {
    return selectedSlotsList.reduce((sum, slot) => sum + (slot.price || 0), 0);
  }, [selectedSlotsList]);

  // Summary labels calculation
  const selectedCourtsNames = useMemo(() => {
    const names = Array.from(new Set(selectedSlotsList.map(s => s.court_name)));
    return names.join(', ');
  }, [selectedSlotsList]);

  const selectedTimeLabels = useMemo(() => {
    return selectedSlotsList.map(s => s.label).join(', ');
  }, [selectedSlotsList]);

  // Handle Next Step -> Navigate to Checkout
  const handleProceedToCheckout = () => {
    if (totalSelectedCount === 0) return;

    // Navigate to checkout with trusted structured state payload
    navigate('/checkout', {
      state: {
        venueId,
        venueName: venue?.venue_name,
        date: selectedDate,
        sportCategory: selectedSport !== 'ALL' ? selectedSport : (selectedSlotsList[0]?.sport_category || 'Thể thao'),
        selectedSlots: selectedSlotsList,
        totalAmount,
        totalHours
      }
    });
  };

  // Location string extraction
  const locationStr = venue?.branches && venue.branches.length > 0
    ? `${venue.branches[0].street_address || ''}, ${venue.branches[0].ward_district_city || ''}`
    : "Chưa cập nhật địa chỉ";

  // Render Loading State
  if (loadingVenue) {
    return (
      <div className="w-full bg-surface-subtle min-h-screen pb-32">
        <div className="bg-surface border-b border-border-subtle-medium py-6 px-4">
          <div className="container mx-auto max-w-6xl space-y-3">
            <Skeleton variant="text" width="200px" height="24px" />
            <Skeleton variant="text" width="350px" height="32px" />
          </div>
        </div>
        <div className="container mx-auto max-w-6xl px-4 mt-8 space-y-6">
          <Skeleton variant="rounded" height="64px" />
          <Skeleton variant="rectangular" height="400px" />
        </div>
      </div>
    );
  }

  // Render Error State
  if (error || !venue) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <ErrorState
          title="Không thể tải lịch sân thể thao"
          description="Đã có lỗi xảy ra khi tải thông tin câu lạc bộ hoặc kết nối bị gián đoạn."
          action={
            <Button variant="primary" leftIcon={<RefreshCw size={16} />} onClick={fetchVenueInfo}>
              Thử lại
            </Button>
          }
          secondaryAction={
            <Button variant="outline" onClick={() => navigate(`/venues/${venueId}`)}>
              Về chi tiết sân
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full bg-surface-subtle min-h-screen pb-36">
      
      {/* 1. HEADER BAR */}
      <section className="bg-surface border-b border-border-subtle-medium shadow-sm sticky top-0 z-30">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/venues/${venueId}`)}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-surface-subtle transition-colors border border-border-subtle-medium"
                aria-label="Quay lại chi tiết sân"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-orange uppercase tracking-wider">Đặt Lịch Trực Quan</span>
                  <Badge variant="primary" size="sm">Alobo Standard Logic</Badge>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                  {venue.venue_name}
                </h1>
                <p className="text-xs text-text-muted flex items-center mt-0.5">
                  <MapPin size={14} className="mr-1 text-brand-orange flex-shrink-0" />
                  <span>{locationStr}</span>
                </p>
              </div>
            </div>

            {/* Quick Status Legend */}
            <div className="flex items-center gap-4 text-xs font-medium text-gray-700 bg-surface-subtle px-3 py-2 rounded-xl border border-border-subtle-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600"></span>
                <span>Còn trống</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-brand-orange"></span>
                <span>Đã chọn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-300"></span>
                <span>Đã đặt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-200"></span>
                <span>Khóa/Bảo trì</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. DATE SELECTOR BAR */}
      <section className="bg-surface border-b border-border-subtle-medium py-3 sticky top-[73px] z-20 shadow-xs">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {availableDates.map((day) => {
              const isSelected = selectedDate === day.isoDate;
              return (
                <button
                  key={day.isoDate}
                  onClick={() => {
                    setSelectedDate(day.isoDate);
                    setSelectedSlotsMap({}); // Reset selection when date changes
                  }}
                  className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl min-w-[90px] border transition-all duration-200 ${
                    isSelected
                      ? 'bg-brand-orange text-white border-brand-orange font-bold shadow-md scale-105'
                      : 'bg-surface hover:bg-surface-subtle text-gray-700 border-border-subtle-medium hover:border-gray-300'
                  }`}
                >
                  <span className="text-[11px] opacity-85 font-medium">{day.dayName}</span>
                  <span className="text-sm font-bold mt-0.5">{day.dayFormatted}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. SPORT CATEGORY FILTER TABS */}
      <section className="container mx-auto max-w-6xl px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Filter size={18} className="mr-2 text-brand-orange" />
            Chọn Đối Tượng Thể Thao
          </h2>
          <span className="text-xs text-text-muted">
            Hiển thị các sân tương ứng với bộ môn
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => setSelectedSport('ALL')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              selectedSport === 'ALL'
                ? 'bg-dark text-white border-dark shadow-sm'
                : 'bg-surface text-gray-700 border-border-subtle-medium hover:bg-surface-subtle'
            }`}
          >
            Tất cả bộ môn ({availabilityData?.courts?.length || 0})
          </button>

          {sportsList.map((sport) => {
            const count = availabilityData?.courts?.filter(c => c.sport_category === sport).length || 0;
            const isSelected = selectedSport === sport;
            return (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-orange text-white border-brand-orange shadow-sm'
                    : 'bg-surface text-gray-700 border-border-subtle-medium hover:bg-surface-subtle'
                }`}
              >
                <span>{sport}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. VISUAL MATRIX / TIME SLOT GRID */}
      <section className="container mx-auto max-w-6xl px-4 mt-6">
        {loadingGrid ? (
          <Card radius="xl" className="p-8 space-y-6 border border-border-subtle-medium">
            <div className="flex justify-between items-center">
              <Skeleton variant="text" width="180px" height="24px" />
              <Skeleton variant="text" width="120px" height="20px" />
            </div>
            <Skeleton variant="rectangular" height="250px" />
          </Card>
        ) : filteredCourts.length === 0 ? (
          <Card radius="xl" className="p-8 border border-border-subtle-medium">
            <EmptyState
              title="Không có sân cho bộ môn này"
              description="Vui lòng chọn môn thể thao khác hoặc chọn ngày khác để tiếp tục đặt lịch."
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredCourts.map((court) => (
              <Card
                key={court.court_id}
                radius="2xl"
                padding="md"
                className="border border-border-subtle-medium shadow-sm bg-surface overflow-hidden"
              >
                {/* Court Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-border-subtle-medium gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-orange/10 text-brand-orange font-bold text-sm flex items-center justify-center border border-brand-orange/20">
                      {court.sport_category ? court.sport_category.substring(0, 2).toUpperCase() : 'ST'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {court.court_name}
                      </h3>
                      <span className="text-xs text-text-muted">
                        Môn: <strong className="text-gray-700 font-semibold">{court.sport_category}</strong>
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={court.court_status === 'ACTIVE' ? 'success' : 'danger'}
                    size="sm"
                  >
                    {court.court_status === 'ACTIVE' ? 'Đang hoạt động' : `Trạng thái: ${court.court_status}`}
                  </Badge>
                </div>

                {/* Time Slots Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
                  {court.slots.map((slot) => {
                    const slotKey = `${court.court_id}___${slot.start_time}`;
                    const isSelected = Boolean(selectedSlotsMap[slotKey]);

                    // Render Available Slot
                    if (slot.status === 'AVAILABLE') {
                      return (
                        <button
                          key={slot.start_time}
                          onClick={() => toggleSlotSelection(court, slot)}
                          className={`p-2.5 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-between relative group ${
                            isSelected
                              ? 'bg-brand-orange text-white border-brand-orange ring-2 ring-brand-orange/30 shadow-md scale-105 z-10'
                              : 'bg-emerald-50/60 hover:bg-emerald-100/80 border-emerald-300/80 text-gray-800 hover:shadow-sm'
                          }`}
                        >
                          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                            {slot.label}
                          </span>
                          
                          <span className={`text-[11px] font-semibold mt-1 ${isSelected ? 'text-white/90' : 'text-emerald-700'}`}>
                            {slot.price ? `${(slot.price).toLocaleString('vi-VN')}đ` : 'Miễn phí'}
                          </span>

                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-brand-orange rounded-full flex items-center justify-center shadow-md">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    }

                    // Render Booked Slot
                    if (slot.status === 'BOOKED') {
                      return (
                        <div
                          key={slot.start_time}
                          className="p-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed flex flex-col items-center justify-between select-none opacity-80"
                          title="Khung giờ này đã được người khác đặt"
                        >
                          <span className="text-xs font-semibold line-through">{slot.label}</span>
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded mt-1">
                            Đã đặt
                          </span>
                        </div>
                      );
                    }

                    // Render Blocked / Maintenance Slot
                    return (
                      <div
                        key={slot.start_time}
                        className="p-2.5 rounded-xl border border-red-200 bg-red-50/60 text-red-400 cursor-not-allowed flex flex-col items-center justify-between select-none"
                        title={slot.reason || 'Tạm khóa'}
                      >
                        <span className="text-xs font-medium">{slot.label}</span>
                        <span className="text-[10px] font-semibold text-red-500 flex items-center gap-0.5 mt-1">
                          <Lock size={10} />
                          {slot.status === 'BLOCKED' ? 'Tạm khóa' : 'Không dụng'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 5. STICKY BOOKING SUMMARY FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border-subtle-medium shadow-2xl py-4">
        <div className="container mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: Summary Details */}
          <div className="w-full md:w-auto flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-text-muted">
                Ngày đặt: <strong className="text-gray-900">{selectedDate.split('-').reverse().join('/')}</strong>
              </span>
              <span className="text-text-muted">
                Môn: <strong className="text-gray-900">{selectedSport === 'ALL' ? 'Nhiều môn' : selectedSport}</strong>
              </span>
              <span className="text-text-muted">
                Tổng giờ: <strong className="text-brand-orange font-bold text-sm">{totalHours}h</strong> ({totalSelectedCount} khung giờ)
              </span>
            </div>

            {totalSelectedCount > 0 ? (
              <div className="text-xs text-gray-700 truncate max-w-2xl">
                <span className="font-semibold text-gray-900">Sân đã chọn: </span>
                <span className="text-brand-orange font-medium">{selectedCourtsNames}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-text-muted">{selectedTimeLabels}</span>
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">
                Vui lòng nhấp chọn các khung giờ còn trống (ô màu xanh) trên bảng trạng thái sân để tiếp tục.
              </p>
            )}
          </div>

          {/* Right: Total Amount & Action Button */}
          <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-border-subtle-medium">
            <div className="text-left md:text-right">
              <span className="text-xs text-text-muted block">Tổng tiền tạm tính</span>
              <span className="text-xl md:text-2xl font-bold text-brand-orange">
                {totalAmount.toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={totalSelectedCount === 0}
              onClick={handleProceedToCheckout}
              rightIcon={<ChevronRight size={18} />}
              className="shadow-md min-w-[160px]"
            >
              TIẾP THEO
            </Button>
          </div>

        </div>
      </div>

    </div>
  );
}
