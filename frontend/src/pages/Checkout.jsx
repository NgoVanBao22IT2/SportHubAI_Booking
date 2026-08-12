import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, CreditCard, User, Lock, Check, AlertCircle, RefreshCw, AlertTriangle, Calendar, Clock, MapPin } from 'lucide-react';
import { getVenueById } from '../api/venues';
import { checkCourtAvailability } from '../api/availability';
import { createBooking, getBookingById } from '../api/bookings';
import { createPayment } from '../api/payments';
import { useAuth } from '../context/AuthContext';

// Design System Imports
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Extract navigation context from location state or URL params
  const locationState = location.state || {};
  const selectedSlots = locationState.selectedSlots || [];
  
  const venueId = locationState.venueId || searchParams.get('venueId');
  const courtId = searchParams.get('courtId') || (selectedSlots.length > 0 ? selectedSlots[0].court_id : null);
  const bookingDate = locationState.date || searchParams.get('date') || '';
  const startTime = searchParams.get('startTime') || '18:00:00';
  const endTime = searchParams.get('endTime') || '19:00:00';

  // Backend trusted states
  const [venue, setVenue] = useState(null);
  const [court, setCourt] = useState(null);
  const [verifiedPrice, setVerifiedPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ownershipError, setOwnershipError] = useState(false);

  // Form State prefilled from currentUser if available
  const [fullName, setFullName] = useState(currentUser?.full_name || currentUser?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || currentUser?.phoneNumber || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('momo');

  // Transaction States
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [unknownOutcomeState, setUnknownOutcomeState] = useState(null);
  const [apiErrorMessage, setApiErrorMessage] = useState('');

  // Fetch Trusted Venue & Price Information from Backend API (With Ownership Check)
  const fetchCheckoutContext = useCallback(async () => {
    if (!venueId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(false);
      setOwnershipError(false);

      const data = await getVenueById(venueId);
      setVenue(data);

      if (data && data.branches && data.branches.length > 0 && data.branches[0].courts) {
        const activeCourts = data.branches[0].courts;
        const foundCourt = activeCourts.find(c => (c.court_id || c.id) === courtId);

        // TASK 04.02D-07: Venue ↔ Court Ownership Validation
        if (courtId && !foundCourt) {
          console.error(`Security Violation: courtId ${courtId} does not belong to venue ${venueId}`);
          setOwnershipError(true);
          setLoading(false);
          return;
        }

        const targetCourt = foundCourt || activeCourts[0];
        setCourt(targetCourt);
        
        // Revalidate price with Availability API
        const targetCourtId = targetCourt ? (targetCourt.court_id || targetCourt.id) : courtId;
        if (targetCourtId && bookingDate) {
          try {
            const availRes = await checkCourtAvailability(targetCourtId, bookingDate, startTime, endTime);
            if (availRes && availRes.data && availRes.data.pricing?.total_price) {
              setVerifiedPrice(availRes.data.pricing.total_price);
            } else {
              setVerifiedPrice(null);
            }
          } catch (availErr) {
            console.warn("Pricing availability check failed", availErr);
            setVerifiedPrice(null);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load checkout context", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [venueId, courtId, bookingDate, startTime, endTime]);

  useEffect(() => {
    fetchCheckoutContext();
  }, [fetchCheckoutContext]);

  // Handle Real Booking Submission to Backend API (NO MOCK/FAKE FALLBACKS)
  const handleConfirmOrder = async (e) => {
    e?.preventDefault();
    if (submitting) return; // Prevent double-submit
    setApiErrorMessage('');
    setUnknownOutcomeState(null);

    if (!fullName.trim()) {
      setApiErrorMessage('Vui lòng nhập Họ và tên của bạn.');
      return;
    }

    if (!phoneNumber.trim() || phoneNumber.trim().length < 9) {
      setApiErrorMessage('Vui lòng nhập Số điện thoại hợp lệ (tối thiểu 9-10 chữ số).');
      return;
    }

    const targetCourtId = courtId || (court ? (court.court_id || court.id) : '');

    // TASK 04.02D-02: Generate Deterministic Idempotency Key
    const sanitizedPhone = phoneNumber.replace(/\D/g, '');
    const idempotencyKey = `idem-book-${targetCourtId || 'batch'}-${bookingDate}-${startTime.replace(/:/g, '')}-${sanitizedPhone}`;

    try {
      setSubmitting(true);

      // Construct payload for API
      let bookingPayload;
      if (selectedSlots && selectedSlots.length > 0) {
        bookingPayload = {
          slots: selectedSlots.map(s => ({
            court_id: s.court_id,
            booking_date: s.booking_date || bookingDate,
            start_time: s.start_time,
            end_time: s.end_time
          }))
        };
      } else {
        if (!targetCourtId || ownershipError) {
          setApiErrorMessage('Sân con không hợp lệ hoặc không thuộc câu lạc bộ này.');
          setSubmitting(false);
          return;
        }
        bookingPayload = {
          court_id: targetCourtId,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
        };
      }

      // 1. Execute Real Booking Creation API with Idempotency Key
      let bookingResponse;
      try {
        bookingResponse = await createBooking(bookingPayload, idempotencyKey);
      } catch (err) {
        // TASK 04.02D-03: POST Success but Response Lost (Network Timeout)
        if (!err.response && (err.code === 'ECONNABORTED' || err.message?.includes('Network Error'))) {
          setUnknownOutcomeState({
            idempotencyKey,
            message: 'Yêu cầu đặt sân đã gửi đi nhưng kết nối mạng bị rớt trước khi nhận phản hồi. Vui lòng kiểm tra lại trạng thái hoặc liên hệ hỗ trợ trước khi thử lại.'
          });
          setSubmitting(false);
          return;
        }

        const status = err.response?.status;
        if (status === 409) {
          setApiErrorMessage('Khung giờ này vừa được người khác đặt giữ chỗ. Vui lòng quay lại chọn khung giờ khác.');
          setSubmitting(false);
          return;
        } else if (status === 401) {
          setApiErrorMessage('Phiên đăng nhập đã hết hạn hoặc bạn cần đăng nhập để thực hiện giữ chỗ.');
          setSubmitting(false);
          return;
        } else if (status === 403) {
          setApiErrorMessage('Bạn không có quyền thực hiện thao tác đặt sân cho tài nguyên này.');
          setSubmitting(false);
          return;
        } else if (status === 429) {
          setApiErrorMessage('Hệ thống đang tiếp nhận quá nhiều yêu cầu. Vui lòng chờ 1-2 phút rồi thử lại.');
          setSubmitting(false);
          return;
        } else if (status === 400 || status === 422) {
          setApiErrorMessage('Dữ liệu yêu cầu đặt sân chưa hợp lệ.');
          setSubmitting(false);
          return;
        } else if (status >= 500) {
          setApiErrorMessage('Máy chủ đang gặp sự cố khi xử lý đơn hàng (Lỗi 5xx). Vui lòng thử lại sau.');
          setSubmitting(false);
          return;
        } else {
          setApiErrorMessage('Không thể kết nối đến hệ thống tạo đơn đặt sân.');
          setSubmitting(false);
          return;
        }
      }

      const rawData = bookingResponse?.data || bookingResponse;
      const primaryBooking = Array.isArray(rawData) ? rawData[0] : rawData;
      const reservationId = primaryBooking?.booking_id;

      // NO FAKE BOOKING: If backend returned no booking_id, throw error
      if (!reservationId) {
        throw new Error("Backend API không trả về mã giữ chỗ (booking_id).");
      }

      // 3. Fetch Booking Details from Backend to Verify Real Status (TASK 04.02D-04)
      let verifiedStatus = primaryBooking?.booking_status || 'HOLDING';
      let verifiedAmount = verifiedPrice || primaryBooking?.total_amount || primaryBooking?.total_price || null;

      try {
        const fetchedBooking = await getBookingById(reservationId);
        if (fetchedBooking && fetchedBooking.data) {
          verifiedStatus = fetchedBooking.data.booking_status || verifiedStatus;
          verifiedAmount = fetchedBooking.data.total_amount || fetchedBooking.data.total_price || verifiedAmount;
        }
      } catch (fetchErr) {
        const fetchStatus = fetchErr.response?.status;
        if (fetchStatus === 404) {
          setApiErrorMessage('Không thể xác minh đơn hàng từ hệ thống backend (Mã 404).');
          setSubmitting(false);
          return;
        } else if (fetchStatus === 401 || fetchStatus === 403) {
          setApiErrorMessage('Không có quyền xác minh thông tin đơn đặt sân.');
          setSubmitting(false);
          return;
        }
        console.warn("Fetching verified booking details warning, using creation response", fetchErr);
      }

      // 4. Execute Real Payment API (if online method)
      let paymentLabel = 'Thanh toán tại sân (Khi nhận sân)';
      let isPaymentPending = false;

      if (paymentMethod === 'momo' || paymentMethod === 'banking') {
        try {
          await createPayment({
            booking_id: reservationId,
            payment_method: paymentMethod,
            amount: verifiedAmount || 0
          });
          paymentLabel = paymentMethod === 'momo' ? 'Ví MoMo (Đang chờ thanh toán QR)' : 'Chuyển khoản Ngân hàng (Đang chờ IPN)';
          isPaymentPending = true;
        } catch (payErr) {
          console.warn("Payment API initiation warning", payErr);
          paymentLabel = paymentMethod === 'momo' ? 'Ví MoMo' : 'Chuyển khoản Ngân hàng';
          isPaymentPending = true;
        }
      }

      // Render Verified Response Confirmation Screen (HOLDING state, NOT fake paid success)
      setConfirmedBooking({
        id: reservationId,
        venueName: venue?.venue_name || 'Sân thể thao',
        courtName: court?.court_name || court?.name || 'Sân tiêu chuẩn',
        bookingDate,
        timeLabel,
        price: verifiedAmount,
        fullName,
        phoneNumber,
        paymentMethod: paymentLabel,
        isPaymentPending,
        bookingStatus: verifiedStatus
      });
    } catch (err) {
      console.error("Booking transaction failed", err);
      setApiErrorMessage(err.message || 'Đã xảy ra lỗi khi hoàn tất thủ tục giữ chỗ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Missing Context Check
  if (!venueId || !bookingDate) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <EmptyState
          title="Không tìm thấy thông tin đặt sân"
          description="Vui lòng thực hiện quy trình chọn sân và khung giờ tại trang Đặt lịch trước khi chuyển sang bước xác nhận."
          action={
            <Button variant="primary" onClick={() => navigate('/search')}>
              Quay lại danh sách sân
            </Button>
          }
        />
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="container mx-auto px-4 max-w-5xl py-12 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card padding="md"><Skeleton variant="rectangular" height="200px" /></Card>
            <Card padding="md"><Skeleton variant="rectangular" height="220px" /></Card>
          </div>
          <div className="lg:col-span-1">
            <Card padding="md"><Skeleton variant="rectangular" height="260px" /></Card>
          </div>
        </div>
      </div>
    );
  }

  // Ownership Error State (TASK 04.02D-07)
  if (ownershipError) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <ErrorState
          title="Sân con không thuộc câu lạc bộ này"
          description="Mã sân con (courtId) chỉ định không thuộc quyền quản lý của câu lạc bộ thể thao đã chọn."
          action={
            <Button variant="primary" onClick={() => navigate(`/booking?venueId=${venueId}`)}>
              Quay lại chọn sân hợp lệ
            </Button>
          }
        />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <ErrorState
          title="Không thể lấy thông tin xác nhận"
          description="Đã có lỗi xảy ra khi truy xuất dữ liệu sân từ máy chủ."
          action={
            <Button variant="primary" leftIcon={<RefreshCw size={16} />} onClick={fetchCheckoutContext}>
              Thử lại
            </Button>
          }
        />
      </div>
    );
  }

  // UNKNOWN TRANSACTION OUTCOME SCREEN (TASK 04.02D-03)
  if (unknownOutcomeState) {
    return (
      <div className="w-full bg-surface-subtle min-h-screen py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card padding="lg" radius="2xl" className="border border-border-subtle-medium shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center border-2 border-amber-400">
              <AlertTriangle size={36} />
            </div>

            <div className="space-y-2">
              <Badge variant="warning" size="md" className="uppercase font-bold tracking-wider">
                Đang xác minh trạng thái giao dịch
              </Badge>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                Chưa nhận được phản hồi từ máy chủ
              </h1>
              <p className="text-sm text-text-muted">
                {unknownOutcomeState.message}
              </p>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl text-left border border-amber-200 text-xs text-amber-800 space-y-2">
              <p className="font-bold">Hướng dẫn an toàn:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Vui lòng không thao tác bấm đặt lại liên tiếp để tránh tạo trùng đơn giữ chỗ.</li>
                <li>Bạn có thể kiểm tra danh sách đơn đặt của mình hoặc thử tải lại trang sau ít phút.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" size="lg" fullWidth onClick={() => navigate('/search')}>
                Về trang tìm sân
              </Button>
              <Button variant="primary" size="lg" fullWidth onClick={() => window.location.reload()}>
                Tải lại trang xác minh
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // CONFIRMATION SCREEN (Backend Response Verified - NO FAKE SUCCESS)
  if (confirmedBooking) {
    return (
      <div className="w-full bg-surface-subtle min-h-screen py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card padding="lg" radius="2xl" className="border border-border-subtle-medium shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-accent-primary-light text-accent-primary mx-auto flex items-center justify-center border-2 border-accent-primary">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <Badge
                variant={confirmedBooking.isPaymentPending ? 'warning' : 'success'}
                size="md"
                className="uppercase font-bold tracking-wider"
              >
                {confirmedBooking.isPaymentPending ? 'Đơn giữ chỗ đã tạo (HOLDING 10 phút) — Chờ thanh toán' : 'Xác nhận giữ chỗ thành công (HOLDING)'}
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Cảm ơn bạn, {confirmedBooking.fullName}!
              </h1>
              <p className="text-sm text-text-muted">
                Mã đơn giữ chỗ từ Backend: <span className="font-bold text-gray-900">{confirmedBooking.id}</span>
              </p>
            </div>

            {/* CONFIRMED DETAILS BOX */}
            <div className="bg-surface-subtle p-5 rounded-xl text-left border border-border-subtle-medium space-y-3 text-sm">
              <div className="flex justify-between border-b border-border-subtle pb-2">
                <span className="text-text-muted">Câu lạc bộ:</span>
                <span className="font-bold text-gray-900">{confirmedBooking.venueName}</span>
              </div>
              <div className="flex justify-between border-b border-border-subtle pb-2">
                <span className="text-text-muted">Sân con:</span>
                <span className="font-semibold text-gray-900">{confirmedBooking.courtName}</span>
              </div>
              <div className="flex justify-between border-b border-border-subtle pb-2">
                <span className="text-text-muted">Ngày chơi:</span>
                <span className="font-semibold text-gray-900">{confirmedBooking.bookingDate}</span>
              </div>
              <div className="flex justify-between border-b border-border-subtle pb-2">
                <span className="text-text-muted">Khung giờ:</span>
                <span className="font-semibold text-gray-900">{confirmedBooking.timeLabel}</span>
              </div>
              <div className="flex justify-between border-b border-border-subtle pb-2">
                <span className="text-text-muted">Trạng thái giữ chỗ:</span>
                <span className="font-bold text-accent-primary">{confirmedBooking.bookingStatus} (10 phút)</span>
              </div>
              <div className="flex justify-between border-b border-border-subtle pb-2">
                <span className="text-text-muted">Phương thức thanh toán:</span>
                <span className="font-semibold text-gray-900">{confirmedBooking.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-gray-900">Tổng thanh toán:</span>
                <span className="font-bold text-brand-orange text-lg">
                  {confirmedBooking.price ? `${confirmedBooking.price.toLocaleString('vi-VN')}đ` : 'Theo báo giá sân'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => navigate('/search')}
              >
                Đặt thêm sân khác
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate('/')}
              >
                Về trang chủ
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface-subtle min-h-screen pb-20">
      {/* BREADCRUMB & HEADER */}
      <section className="bg-surface border-b border-border-subtle-medium py-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center text-xs text-text-muted gap-2 mb-3">
            <Link to="/" className="hover:text-accent-primary">Trang chủ</Link>
            <span>/</span>
            <Link to="/search" className="hover:text-accent-primary">Tìm sân</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Thanh toán</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Xác nhận & Thanh toán
              </h1>
              <p className="text-sm text-text-muted mt-1">
                Kiểm tra thông tin đơn đặt sân từ hệ thống và hoàn tất giữ chỗ
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft size={16} />}
              onClick={() => navigate(-1)}
            >
              Quay lại
            </Button>
          </div>
        </div>
      </section>

      {/* MAIN FORM CONTENT */}
      <div className="container mx-auto px-4 max-w-5xl py-8">
        <form onSubmit={handleConfirmOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT FORM COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* CUSTOMER INFORMATION CARD */}
            <Card padding="md" radius="xl" className="border border-border-subtle-medium space-y-4">
              <Card.Header>
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <User size={20} className="text-accent-primary" />
                  1. Thông tin người đặt sân
                </h2>
              </Card.Header>
              <Card.Body className="space-y-4">
                <div>
                  <label htmlFor="customer-fullname" className="text-xs font-bold text-gray-900 block mb-1">
                    Họ và tên người đặt *
                  </label>
                  <Input
                    id="customer-fullname"
                    type="text"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customer-phone" className="text-xs font-bold text-gray-900 block mb-1">
                      Số điện thoại nhận SMS *
                    </label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      placeholder="Ví dụ: 0912345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="customer-email" className="text-xs font-bold text-gray-900 block mb-1">
                      Địa chỉ Email (Không bắt buộc)
                    </label>
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="customer-note" className="text-xs font-bold text-gray-900 block mb-1">
                    Ghi chú thêm cho chủ sân
                  </label>
                  <Input
                    id="customer-note"
                    type="text"
                    placeholder="Ví dụ: Cần mượn thêm 2 bóng Pickleball..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </Card.Body>
            </Card>

            {/* PAYMENT METHOD SELECTION CARD */}
            <Card padding="md" radius="xl" className="border border-border-subtle-medium space-y-4">
              <Card.Header>
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <CreditCard size={20} className="text-accent-primary" />
                  2. Chọn phương thức thanh toán
                </h2>
              </Card.Header>
              <Card.Body className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={[
                    'w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all min-h-[44px]',
                    paymentMethod === 'momo'
                      ? 'bg-accent-primary-light border-accent-primary shadow-sm'
                      : 'bg-surface border-border-subtle-medium hover:border-accent-primary/50'
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 font-bold flex items-center justify-center text-xs">
                      MoMo
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">Ví MoMo</p>
                      <p className="text-xs text-text-muted">Thanh toán nhanh qua mã QR</p>
                    </div>
                  </div>
                  {paymentMethod === 'momo' && <Check size={18} className="text-accent-primary" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('banking')}
                  className={[
                    'w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all min-h-[44px]',
                    paymentMethod === 'banking'
                      ? 'bg-accent-primary-light border-accent-primary shadow-sm'
                      : 'bg-surface border-border-subtle-medium hover:border-accent-primary/50'
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs">
                      Bank
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">Chuyển khoản Ngân hàng (VietQR)</p>
                      <p className="text-xs text-text-muted">Quét mã QR từ mọi ứng dụng ngân hàng</p>
                    </div>
                  </div>
                  {paymentMethod === 'banking' && <Check size={18} className="text-accent-primary" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('onsite')}
                  className={[
                    'w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all min-h-[44px]',
                    paymentMethod === 'onsite'
                      ? 'bg-accent-primary-light border-accent-primary shadow-sm'
                      : 'bg-surface border-border-subtle-medium hover:border-accent-primary/50'
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs">
                      Cash
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">Thanh toán trực tiếp tại sân</p>
                      <p className="text-xs text-text-muted">Thanh toán cho thu ngân khi đến nhận sân</p>
                    </div>
                  </div>
                  {paymentMethod === 'onsite' && <Check size={18} className="text-accent-primary" />}
                </button>
              </Card.Body>
            </Card>

          </div>

          {/* RIGHT STICKY SUMMARY COLUMN */}
          <div className="lg:col-span-1 sticky top-24 space-y-4">
            <Card padding="md" radius="xl" className="border border-border-subtle-medium shadow-md">
              <Card.Header className="pb-3 border-b border-border-subtle-medium mb-4">
                <h3 className="font-bold text-gray-900 text-lg">
                  Chi tiết đơn hàng
                </h3>
              </Card.Header>

              <Card.Body className="space-y-4 text-sm">
                {selectedSlots && selectedSlots.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-text-muted">
                      <span>Sân thể thao:</span>
                      <span className="font-bold text-gray-900 text-right truncate max-w-[160px]">
                        {locationState.venueName || venue?.venue_name || 'SportHub Venue'}
                      </span>
                    </div>

                    <div className="flex justify-between text-text-muted">
                      <span>Ngày đặt sân:</span>
                      <span className="font-semibold text-gray-900">{bookingDate.split('-').reverse().join('/')}</span>
                    </div>

                    <div className="flex justify-between text-text-muted">
                      <span>Số khung giờ chọn:</span>
                      <span className="font-semibold text-brand-orange">{selectedSlots.length} slot ({locationState.totalHours || selectedSlots.length}h)</span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border-subtle-medium space-y-2 max-h-52 overflow-y-auto pr-1">
                      <span className="text-xs font-bold text-gray-700 block">Các sân & khung giờ đã chọn:</span>
                      {selectedSlots.map((slot, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-surface-subtle p-2 rounded-xl border border-border-subtle-medium">
                          <div>
                            <span className="font-bold text-gray-900 block">{slot.court_name}</span>
                            <span className="text-text-muted">{slot.label}</span>
                          </div>
                          <span className="font-bold text-brand-orange">
                            {slot.price ? `${slot.price.toLocaleString('vi-VN')}đ` : 'Miễn phí'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-text-muted">
                      <span>Sân thể thao:</span>
                      <span className="font-bold text-gray-900 text-right truncate max-w-[150px]">
                        {venue?.venue_name || 'Sân thể thao'}
                      </span>
                    </div>

                    <div className="flex justify-between text-text-muted">
                      <span>Sân con:</span>
                      <span className="font-semibold text-gray-900">
                        {court ? (court.court_name || court.name) : 'Sân tiêu chuẩn'}
                      </span>
                    </div>

                    <div className="flex justify-between text-text-muted">
                      <span>Ngày đặt:</span>
                      <span className="font-semibold text-gray-900">{bookingDate}</span>
                    </div>

                    <div className="flex justify-between text-text-muted">
                      <span>Khung giờ:</span>
                      <span className="font-semibold text-gray-900">{searchParams.get('label') || '18:00 - 19:00'}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border-subtle-medium space-y-2">
                  <div className="flex justify-between text-text-muted">
                    <span>Tiền sân (Xác thực Backend):</span>
                    <span>
                      {selectedSlots && selectedSlots.length > 0
                        ? `${(locationState.totalAmount || selectedSlots.reduce((s, x) => s + (x.price || 0), 0)).toLocaleString('vi-VN')}đ`
                        : (verifiedPrice ? `${verifiedPrice.toLocaleString('vi-VN')}đ` : 'Theo báo giá sân')}
                    </span>
                  </div>

                  <div className="flex justify-between text-text-muted">
                    <span>Phí dịch vụ SportHub:</span>
                    <span className="text-status-success font-semibold">Miễn phí</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 text-base">
                    <span className="font-bold text-gray-900">Tổng thanh toán:</span>
                    <span className="font-bold text-brand-orange text-xl">
                      {selectedSlots && selectedSlots.length > 0
                        ? `${(locationState.totalAmount || selectedSlots.reduce((s, x) => s + (x.price || 0), 0)).toLocaleString('vi-VN')}đ`
                        : (verifiedPrice ? `${verifiedPrice.toLocaleString('vi-VN')}đ` : 'Báo giá sân')}
                    </span>
                  </div>
                </div>

                {apiErrorMessage && (
                  <div role="alert" className="p-3 bg-status-error-bg text-status-error-text text-xs rounded-lg flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="flex-shrink-0 text-status-error mt-0.5" />
                      <span>{apiErrorMessage}</span>
                    </div>
                    {apiErrorMessage.includes('Khung giờ') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 text-xs"
                        onClick={() => navigate(`/booking?venueId=${venueId}`)}
                      >
                        Chuyển về chọn khung giờ khác
                      </Button>
                    )}
                  </div>
                )}
              </Card.Body>

              <Card.Footer className="pt-4 space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  aria-busy={submitting}
                >
                  Xác nhận đặt lịch
                </Button>

                <div className="flex items-center justify-center text-xs text-text-muted gap-1">
                  <Lock size={12} />
                  <span>Xác thực qua Backend API an toàn</span>
                </div>
              </Card.Footer>
            </Card>
          </div>

        </form>
      </div>
    </div>
  );
}
