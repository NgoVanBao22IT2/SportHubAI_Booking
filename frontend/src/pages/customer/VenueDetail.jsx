import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Phone, Heart, Calendar, Star, CheckCircle2, Navigation, Image as ImageIcon, LayoutGrid, RefreshCw, ArrowRight } from 'lucide-react';
import { getVenueById, getFeaturedVenues, getVenueImages } from '../../api/venues';
import { addFavorite } from '../../api/favorites';

// Design System Imports
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import VenueCard from '../../components/domain/VenueCard';
import BookingModal from '../../components/domain/BookingModal';

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState(null);
  const [similarVenues, setSimilarVenues] = useState([]);
  const [venueImages, setVenueImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('Thông tin');
  const [favPending, setFavPending] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const fetchVenueDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getVenueById(id);
      setVenue(data);

      // Fetch images
      const imgs = await getVenueImages(id);
      setVenueImages(imgs || []);

      // Fetch similar venues
      const similar = await getFeaturedVenues(4);
      setSimilarVenues((similar || []).filter(v => (v.venue_id || v.id) !== id).slice(0, 3));
    } catch (err) {
      console.error("Failed to load venue details", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVenueDetails();
  }, [fetchVenueDetails]);

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="w-full bg-surface pb-20">
        <Skeleton variant="rectangular" height="360px" />
        <div className="container mx-auto px-4 max-w-5xl -mt-20 relative z-10">
          <Card radius="2xl" className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Skeleton variant="rounded" width="140px" height="140px" className="-mt-12" />
              <div className="flex-1 space-y-3 w-full">
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="60%" height="2rem" />
                <Skeleton variant="text" width="40%" />
              </div>
              <div className="w-full md:w-48 space-y-2">
                <Skeleton variant="rounded" height="44px" />
                <Skeleton variant="rounded" height="44px" />
              </div>
            </div>
          </Card>
          <div className="mt-8 space-y-4">
            <Skeleton variant="rounded" height="48px" />
            <Skeleton variant="rectangular" height="240px" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <ErrorState
          title="Không thể tải chi tiết sân thể thao"
          description="Đã có lỗi xảy ra trong quá trình truy xuất dữ liệu sân. Vui lòng kiểm tra lại đường truyền."
          action={
            <Button variant="primary" leftIcon={<RefreshCw size={16} />} onClick={fetchVenueDetails}>
              Thử lại
            </Button>
          }
          secondaryAction={
            <Button variant="outline" onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
          }
        />
      </div>
    );
  }

  // Empty State (Venue Not Found)
  if (!venue) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <EmptyState
          title="Không tìm thấy thông tin sân"
          description="Sân thể thao bạn tìm kiếm không tồn tại hoặc đã ngừng hoạt động."
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Khám phá sân khác
            </Button>
          }
        />
      </div>
    );
  }

  // Location string extraction
  const locationStr = venue.branches && venue.branches.length > 0
    ? `${venue.branches[0].street_address || ''}, ${venue.branches[0].ward_district_city || ''}`
    : "Chưa cập nhật địa chỉ";

  // Facilities list fallback
  const facilitiesList = venue.facilities && venue.facilities.length > 0
    ? venue.facilities
    : [
        { facility_id: '1', facility_name: 'Cho thuê vợt thi đấu (Victor, Yonex)' },
        { facility_id: '2', facility_name: 'Wifi miễn phí tốc độ cao' },
        { facility_id: '3', facility_name: 'Nước giải khát & Phục vụ Snack' },
        { facility_id: '4', facility_name: 'Phòng thay đồ & Nhà tắm nước nóng' },
      ];

  // Gallery Photos fallback list
  const galleryPhotos = venueImages.length >= 5
    ? venueImages.map(img => img.image_url)
    : [
        '/gallery_main.png',
        '/gallery_racket.png',
        'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=600&auto=format&fit=crop',
        '/gallery_blue.png',
        'https://images.unsplash.com/photo-1521537634581-0ddea2eed258?q=80&w=600&auto=format&fit=crop'
      ];

  return (
    <div className="w-full bg-surface-subtle pb-20">
      {/* 1. HERO BANNER */}
      <section className="w-full h-[300px] md:h-[380px] relative bg-dark">
        <img src="/venue_hero.png" alt={`${venue.venue_name} Hero`} className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark/60 via-transparent to-transparent"></div>
      </section>

      {/* 2. OVERLAPPING INFO CARD */}
      <section className="container mx-auto px-4 max-w-5xl -mt-24 relative z-10">
        <Card radius="2xl" padding="lg" className="shadow-lg border border-border-subtle-medium bg-surface">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* Venue Avatar / Logo */}
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl border border-border-subtle-medium shadow-sm bg-surface flex items-center justify-center flex-shrink-0 p-2 overflow-hidden -mt-14 md:-mt-16 relative">
              <div className="w-full h-full border border-accent-primary-light rounded-xl flex items-center justify-center font-bold text-2xl text-accent-primary bg-surface-subtle shadow-inner">
                {venue.venue_name.substring(0, 3).toUpperCase()}
              </div>
            </div>

            {/* Venue Metadata */}
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="rating" size="sm" leftIcon={<Star size={12} className="fill-current text-brand-orange-hover" />}>
                  4.8 <span className="font-normal opacity-75 ml-0.5">(1k+ đánh giá)</span>
                </Badge>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                {venue.venue_name}
              </h1>

              <div className="space-y-2 text-sm text-text-muted pt-1">
                <div className="flex items-start">
                  <MapPin size={16} className="mr-2 mt-0.5 text-text-muted flex-shrink-0" />
                  <span>{locationStr}</span>
                </div>
                <div className="flex items-center">
                  <Clock size={16} className="mr-2 text-text-muted flex-shrink-0" />
                  <span>04:30 - 23:30 hàng ngày</span>
                </div>
                <div className="flex items-center">
                  <Phone size={16} className="mr-2 text-text-muted flex-shrink-0" />
                  <span>{venue.contact_phone || 'Chưa cập nhật SĐT'}</span>
                </div>
              </div>
            </div>

            {/* Booking & Favorite Action Buttons */}
            <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[200px] pt-2 md:pt-0">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={<Calendar size={18} />}
                onClick={() => setIsBookingModalOpen(true)}
              >
                Đặt lịch
              </Button>
              <Button
                variant="outline"
                size="md"
                fullWidth
                disabled={favPending}
                aria-busy={favPending}
                leftIcon={<Heart size={18} />}
                aria-label="Thêm sân vào danh sách yêu thích"
                onClick={async () => {
                  if (favPending) return;
                  try {
                    setFavPending(true);
                    await addFavorite(id);
                    alert("Đã thêm vào danh sách yêu thích thành công.");
                  } catch (err) {
                    console.error("Failed to add favorite", err);
                    const status = err.response?.status;
                    if (status === 401) {
                      alert("Vui lòng đăng nhập để sử dụng danh sách yêu thích.");
                    } else if (status === 409) {
                      alert("Sân này đã có trong danh sách yêu thích của bạn.");
                    } else {
                      alert("Tính năng Backend Favorites chưa khả dụng trên máy chủ (/api/v1/favorites).");
                    }
                  } finally {
                    setFavPending(false);
                  }
                }}
              >
                Yêu thích
              </Button>
            </div>

          </div>
        </Card>
      </section>

      {/* 3. TABS NAVIGATION & CONTENT */}
      <section className="container mx-auto px-4 max-w-5xl mt-8">
        <Tabs activeTab={activeTab} onChange={setActiveTab} variant="line" size="md">
          <Tabs.List className="mb-8">
            <Tabs.Tab value="Thông tin">Thông tin</Tabs.Tab>
            <Tabs.Tab value="Hình ảnh">Hình ảnh</Tabs.Tab>
            <Tabs.Tab value="Dịch vụ">Dịch vụ</Tabs.Tab>
            <Tabs.Tab value="Điều khoản & quy định">Điều khoản & quy định</Tabs.Tab>
            <Tabs.Tab value="Đánh giá">Đánh giá</Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: THÔNG TIN */}
          <Tabs.Panel value="Thông tin">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Giới thiệu */}
                <Card radius="xl" padding="md" className="border border-border-subtle-medium">
                  <Card.Header className="mb-3">
                    <h3 className="font-bold text-gray-900 text-lg flex items-center">
                      <span className="w-6 h-6 rounded-full bg-status-info-bg text-status-info-text flex items-center justify-center mr-2 text-xs font-bold">i</span>
                      Giới thiệu sân
                    </h3>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-text-muted text-sm leading-relaxed">
                      {venue.venue_description || "Câu lạc bộ tự hào sở hữu nhiều thảm tiêu chuẩn thi đấu quốc tế. Không gian thoáng đãng, hệ thống ánh sáng chống chói mắt chuyên dụng, đảm bảo trải nghiệm tốt nhất cho các vận động viên từ phong trào đến chuyên nghiệp. Sân tọa lạc tại vị trí thuận lợi, dễ dàng tìm kiếm và có bãi đỗ xe rộng rãi."}
                    </p>
                  </Card.Body>
                </Card>

                {/* Dịch vụ & Tiện ích */}
                <Card radius="xl" padding="md" className="border border-border-subtle-medium">
                  <Card.Header className="mb-3">
                    <h3 className="font-bold text-gray-900 text-lg flex items-center">
                      <span className="w-6 h-6 rounded-full bg-brand-orange-light text-brand-orange-hover flex items-center justify-center mr-2 text-xs font-bold">★</span>
                      Dịch vụ & Tiện ích
                    </h3>
                  </Card.Header>
                  <Card.Body>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                      {facilitiesList.map((facility, idx) => (
                        <div key={idx} className="flex items-center text-sm text-gray-800">
                          <CheckCircle2 size={18} className="text-accent-primary mr-2.5 flex-shrink-0" />
                          <span>{facility.facility_name}</span>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              </div>

              {/* Vị trí sân (Map Section) */}
              <div className="lg:col-span-1">
                <Card radius="xl" padding="md" className="border border-border-subtle-medium sticky top-24">
                  <Card.Header className="mb-3">
                    <h3 className="font-bold text-gray-900 text-lg flex items-center">
                      <span className="w-6 h-6 rounded-full bg-accent-primary-light text-accent-primary flex items-center justify-center mr-2 text-xs font-bold">📍</span>
                      Vị trí địa lý
                    </h3>
                  </Card.Header>
                  <Card.Body>
                    <div className="w-full aspect-square bg-accent-primary-light rounded-xl relative overflow-hidden flex items-center justify-center border border-accent-primary-light">
                      <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-accent-primary/20"></div>
                      
                      <div className="absolute z-10 flex flex-col items-center">
                        <div className="bg-surface shadow-md rounded-full px-3 py-1 flex items-center mb-1 border border-border-subtle-medium">
                          <span className="font-bold text-xs text-gray-900">SPORTHUB</span>
                          <span className="text-[10px] text-text-muted ml-1 font-semibold">VENUE</span>
                        </div>
                        <div className="w-4 h-4 bg-status-error rotate-45 transform origin-center border-2 border-surface shadow-sm -mt-2"></div>
                      </div>

                      <div className="absolute top-1/4 left-0 right-0 h-1 bg-surface/60 -rotate-12"></div>
                      <div className="absolute bottom-1/3 left-0 right-0 h-2 bg-surface/80 rotate-6"></div>

                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Navigation size={12} />}
                        className="absolute bottom-3 left-3 shadow-sm bg-surface"
                      >
                        Chỉ đường
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </div>
          </Tabs.Panel>

          {/* TAB 2: HÌNH ẢNH (BENTO GALLERY) */}
          <Tabs.Panel value="Hình ảnh">
            <Card radius="xl" padding="md" className="border border-border-subtle-medium space-y-6">
              <Card.Header className="mb-2">
                <h3 className="font-bold text-gray-900 text-lg flex items-center">
                  <span className="w-8 h-8 rounded-lg bg-status-info-bg text-status-info-text flex items-center justify-center mr-3">
                    <ImageIcon size={18} />
                  </span>
                  Thư viện hình ảnh
                </h3>
              </Card.Header>
              <Card.Body>
                {/* GALLERY BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-auto md:h-[450px]">
                  {/* Main Big Photo (Left - 7 cols) */}
                  <div className="md:col-span-7 h-[260px] md:h-full rounded-2xl overflow-hidden shadow-sm relative group">
                    <img
                      src={galleryPhotos[0]}
                      alt={`${venue.venue_name} Photo 1`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* 4 Small Photos (Right - 5 cols in 2x2 grid) */}
                  <div className="md:col-span-5 grid grid-cols-2 gap-4 h-full">
                    <div className="rounded-2xl overflow-hidden shadow-sm h-[120px] md:h-full relative group">
                      <img src={galleryPhotos[1]} alt="Gallery Photo 2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    
                    <div className="rounded-2xl overflow-hidden shadow-sm h-[120px] md:h-full relative group">
                      <img src={galleryPhotos[2]} alt="Gallery Photo 3" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>

                    <div className="rounded-2xl overflow-hidden shadow-sm h-[120px] md:h-full relative group">
                      <img src={galleryPhotos[3]} alt="Gallery Photo 4" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>

                    {/* 4th Photo with Overlay */}
                    <div className="rounded-2xl overflow-hidden shadow-sm h-[120px] md:h-full relative group cursor-pointer">
                      <img src={galleryPhotos[4]} alt="Gallery Photo 5" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-dark/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white transition-opacity group-hover:bg-dark/80">
                        <LayoutGrid size={20} className="mb-1 text-white/90" />
                        <span className="text-xs font-bold tracking-wide">Xem tất cả</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Tabs.Panel>

          {/* TAB 3, 4, 5: OTHER TABS */}
          {['Dịch vụ', 'Điều khoản & quy định', 'Đánh giá'].includes(activeTab) && (
            <Tabs.Panel value={activeTab}>
              <EmptyState
                title={`Nội dung ${activeTab}`}
                description="Thông tin chi tiết phần này đang được ban quản lý cập nhật thêm."
              />
            </Tabs.Panel>
          )}
        </Tabs>
      </section>

      {/* 4. SIMILAR VENUES SECTION USING REUSABLE VENUECARD */}
      <section className="container mx-auto px-4 max-w-5xl mt-16 pt-10 border-t border-border-subtle-medium">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Sân tương tự gần đây</h2>
            <p className="text-sm text-text-muted">Các câu lạc bộ chất lượng cao cùng khu vực</p>
          </div>
          <Link to="/search">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={16} />}>
              Xem tất cả
            </Button>
          </Link>
        </div>

        {similarVenues.length === 0 ? (
          <EmptyState
            size="sm"
            title="Chưa có sân tương tự"
            description="Hiện chưa tìm thấy câu lạc bộ tương tự ở gần vị trí này."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {similarVenues.map((v) => (
              <VenueCard
                key={v.venue_id || v.id}
                venue={v}
                onBook={(targetVenue) => navigate(`/venues/${targetVenue.venue_id || targetVenue.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* CHỌN HÌNH THỨC ĐẶT MODAL */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSelectVisualBooking={() => {
          setIsBookingModalOpen(false);
          navigate(`/venues/${id}/booking`);
        }}
        venue={venue}
      />
    </div>
  );
}
