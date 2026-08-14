import React, { useState, useEffect } from 'react';
import { X, CreditCard, Save } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const VIETNAM_BANKS = [
  'MB Bank (Ngân hàng Quân Đội)',
  'Vietcombank (VCB)',
  'Techcombank (TCB)',
  'VietinBank',
  'BIDV',
  'ACB',
  'VPBank',
  'TPBank',
  'Sacombank',
  'Agribank',
  'VIB',
  'HD Bank'
];

export default function PaymentAccountFormModal({
  isOpen,
  onClose,
  account,
  venues,
  onSubmit,
  loading
}) {
  const [form, setForm] = useState({
    venue_id: '',
    payment_method: 'BANK_TRANSFER',
    bank_name: 'MB Bank (Ngân hàng Quân Đội)',
    account_number: '',
    account_name: '',
    phone_number: '',
    qr_code_url: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (account) {
      setForm({
        venue_id: account.venue_id || (venues[0]?.venue_id || ''),
        payment_method: account.payment_method || 'BANK_TRANSFER',
        bank_name: account.bank_name || 'MB Bank (Ngân hàng Quân Đội)',
        account_number: account.account_number || '',
        account_name: account.account_name || '',
        phone_number: account.phone_number || '',
        qr_code_url: account.qr_code_url || ''
      });
    } else {
      setForm({
        venue_id: venues[0]?.venue_id || '',
        payment_method: 'BANK_TRANSFER',
        bank_name: 'MB Bank (Ngân hàng Quân Đội)',
        account_number: '',
        account_name: '',
        phone_number: '',
        qr_code_url: ''
      });
    }
    setError('');
  }, [account, isOpen, venues]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.venue_id) {
      setError('Vui lòng chọn Câu lạc bộ.');
      return;
    }
    if (!form.account_name.trim()) {
      setError('Vui lòng nhập Tên chủ tài khoản.');
      return;
    }
    if (!form.account_number.trim()) {
      setError('Vui lòng nhập Số tài khoản / Số điện thoại.');
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-md rounded-2xl border border-border-subtle-medium shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-subtle">
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <CreditCard size={18} className="text-brand-orange" />
            {account ? 'Chỉnh sửa Tài khoản thanh toán' : 'Thêm Tài khoản thanh toán mới'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-text-muted hover:text-gray-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Venue Selection */}
          <div className="space-y-1">
            <label className="font-bold text-gray-900 block">Chọn Câu lạc bộ áp dụng *</label>
            <select
              name="venue_id"
              value={form.venue_id}
              onChange={handleChange}
              disabled={Boolean(account)}
              className="w-full p-2.5 rounded-xl border border-border-subtle-medium bg-surface text-gray-900 focus:border-brand-orange focus:outline-none text-xs"
            >
              {venues.map((v) => (
                <option key={v.venue_id} value={v.venue_id}>
                  {v.venue_name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="font-bold text-gray-900 block">Phương thức thanh toán *</label>
            <select
              name="payment_method"
              value={form.payment_method}
              onChange={handleChange}
              className="w-full p-2.5 rounded-xl border border-border-subtle-medium bg-surface text-gray-900 focus:border-brand-orange focus:outline-none text-xs"
            >
              <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng (BANK_TRANSFER)</option>
              <option value="MOMO">Ví MoMo (MOMO)</option>
            </select>
          </div>

          {/* Bank Transfer Specific Fields */}
          {form.payment_method === 'BANK_TRANSFER' ? (
            <>
              <div className="space-y-1">
                <label className="font-bold text-gray-900 block">Tên Ngân hàng *</label>
                <select
                  name="bank_name"
                  value={form.bank_name}
                  onChange={handleChange}
                  className="w-full p-2.5 rounded-xl border border-border-subtle-medium bg-surface text-gray-900 focus:border-brand-orange focus:outline-none text-xs"
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <Input
                  label="Số tài khoản ngân hàng (STK) *"
                  name="account_number"
                  placeholder="VD: 190388888888..."
                  value={form.account_number}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <Input
                label="Số điện thoại Ví MoMo *"
                name="account_number"
                placeholder="VD: 0905123456..."
                value={form.account_number}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {/* Account Owner Name */}
          <div>
            <Input
              label="Tên chủ tài khoản (Viết hoa không dấu) *"
              name="account_name"
              placeholder="VD: NGO VAN BAO"
              value={form.account_name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Custom QR URL */}
          <div>
            <Input
              label="URL Ảnh QR Code (Để trống để tự tạo VietQR / MoMo)"
              name="qr_code_url"
              placeholder="https://res.cloudinary.com/..."
              value={form.qr_code_url}
              onChange={handleChange}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={loading} leftIcon={<Save size={16} />}>
              {account ? 'Lưu thay đổi' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
