import React, { useState, useEffect } from 'react';
import {
  SettingOutlined,
  SaveOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ShopOutlined,
  ReloadOutlined,
  PrinterOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  getCompanyDeliveryInfo,
  saveCompanyDeliveryInfo,
  CompanyDeliveryInfo,
  DEFAULT_COMPANY_DELIVERY_INFO,
} from '../../../lib/companySettings';
import {
  getLocationCopyConfig,
  saveLocationCopyConfig,
  DEFAULT_LOCATION_LIST,
  LocationCopyConfig,
} from '../../../lib/locationSettings';
import { DeliverySlipModal } from '../../orders/components/DeliverySlipModal';

export const CompanyConfigPage: React.FC = () => {
  const [formData, setFormData] = useState<CompanyDeliveryInfo>(getCompanyDeliveryInfo);
  const [isSaved, setIsSaved] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Cấu hình số bản in theo địa điểm
  const [copyConfig, setCopyConfig] = useState<LocationCopyConfig>(getLocationCopyConfig);
  const [isLocationSaved, setIsLocationSaved] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCopies, setNewLocCopies] = useState(2);

  useEffect(() => {
    setFormData(getCompanyDeliveryInfo());
    setCopyConfig(getLocationCopyConfig());
  }, []);

  const handleSaveLocationConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveLocationCopyConfig(copyConfig);
    setIsLocationSaved(true);
    setTimeout(() => setIsLocationSaved(false), 3000);
  };

  const handleUpdateLocCopies = (key: string, copies: number) => {
    setCopyConfig((prev) => ({
      ...prev,
      locationCopies: {
        ...prev.locationCopies,
        [key]: Math.max(1, copies),
      },
    }));
  };

  const handleAddNewLocConfig = () => {
    if (!newLocName.trim()) return;
    setCopyConfig((prev) => ({
      ...prev,
      locationCopies: {
        ...prev.locationCopies,
        [newLocName.trim()]: Math.max(1, newLocCopies),
      },
    }));
    setNewLocName('');
    setNewLocCopies(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompanyDeliveryInfo(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetDefault = () => {
    if (confirm('Bạn có chắc chắn muốn đặt lại thông tin đơn vị giao hàng về mặc định?')) {
      setFormData(DEFAULT_COMPANY_DELIVERY_INFO);
      saveCompanyDeliveryInfo(DEFAULT_COMPANY_DELIVERY_INFO);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* HEADER TRANG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <SettingOutlined className="text-xl text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              Cấu hình Thông tin Đơn vị Giao hàng
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thông tin đơn vị giao hàng này sẽ được hiển thị ở góc trên tất cả các Phiếu Giao Hàng (popup xem và bản in).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <EyeOutlined />
            <span>Xem trước phiếu mẫu</span>
          </button>
        </div>
      </div>

      {/* THÔNG BÁO LƯU THÀNH CÔNG */}
      {isSaved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200 shadow-2xs">
          <CheckCircleOutlined className="text-base text-emerald-600 shrink-0" />
          <span>Đã lưu thành công thông tin Đơn vị giao hàng! Phiếu giao hàng sẽ tự động cập nhật ngay lập tức.</span>
        </div>
      )}

      {/* FORM CÀI ĐẶT CHÍNH */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
      >
        <div className="bg-[#0f172a] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShopOutlined className="text-slate-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Thông tin Doanh nghiệp / Xưởng Giao hàng
            </h2>
          </div>
          <button
            type="button"
            onClick={handleResetDefault}
            className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer flex items-center gap-1"
          >
            <ReloadOutlined className="text-[10px]" />
            <span>Khôi phục mặc định</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Tên đơn vị giao hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Ví dụ: CÔNG TY TNHH THINHPHONGDO..."
              className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition shadow-2xs"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Dòng hiển thị đầu tiên trên phiếu: "Đơn vị giao hàng: [Tên công ty]"
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Địa chỉ đơn vị giao hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ví dụ: Số 215 ngõ 264 Ngọc Thụy, P. Ngọc Thụy, Q. Long Biên, HN."
              className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mã số thuế (MST)
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="Ví dụ: 01N8006168"
                className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Người đại diện pháp lý / xưởng
              </label>
              <input
                type="text"
                value={formData.representative}
                onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                placeholder="Ví dụ: (Bà) Trần Khánh Ly"
                className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Số điện thoại liên hệ / Hotline
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Ví dụ: 086.709.9978"
              className="w-full h-11 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition shadow-2xs"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="submit"
              className="h-10 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95"
            >
              <SaveOutlined />
              <span>Lưu cấu hình đơn vị</span>
            </button>
          </div>
        </div>
      </form>

      {/* THÔNG BÁO LƯU CẤU HÌNH ĐỊA ĐIỂM THÀNH CÔNG */}
      {isLocationSaved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200 shadow-2xs">
          <CheckCircleOutlined className="text-base text-emerald-600 shrink-0" />
          <span>Đã lưu thành công cấu hình số bản in theo địa điểm! Khi in phiếu hệ thống sẽ tự động in đúng số bản này.</span>
        </div>
      )}

      {/* FORM CÀI ĐẶT SỐ BẢN IN THEO ĐỊA ĐIỂM */}
      <form
        onSubmit={handleSaveLocationConfig}
        className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
      >
        <div className="bg-[#0f172a] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PrinterOutlined className="text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Cấu hình Số bản in theo Địa điểm giao hàng (Mặc định 2 bản khi in phiếu)
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="font-bold text-slate-800 uppercase block">Số bản in mặc định cho tất cả địa điểm</span>
              <span className="text-slate-500">Áp dụng khi địa điểm chưa được cài đặt số bản in riêng</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="10"
                value={copyConfig.defaultCopies}
                onChange={(e) =>
                  setCopyConfig((prev) => ({
                    ...prev,
                    defaultCopies: Math.max(1, parseInt(e.target.value) || 2),
                  }))
                }
                className="w-20 h-10 px-3 text-center text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <span className="font-semibold text-slate-600">bản / phiếu</span>
            </div>
          </div>

          {/* BẢNG CẤU HÌNH TỪNG ĐỊA ĐIỂM */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase mb-2">
              Danh sách Địa điểm & Số bản in riêng
            </h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f8fafc] text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">STT</th>
                    <th className="px-4 py-3 min-w-[200px]">TÊN ĐỊA ĐIỂM</th>
                    <th className="px-4 py-3 min-w-[180px]">GHI CHÚ / CƠ SỞ</th>
                    <th className="px-4 py-3 w-40 text-center">SỐ BẢN IN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {DEFAULT_LOCATION_LIST.map((loc, idx) => {
                    const currentCopies = copyConfig.locationCopies[loc.id] ?? copyConfig.locationCopies[loc.name] ?? 2;
                    return (
                      <tr key={loc.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{loc.name}</td>
                        <td className="px-4 py-3 text-slate-600">{loc.note}</td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={currentCopies}
                              onChange={(e) => handleUpdateLocCopies(loc.id, parseInt(e.target.value) || 2)}
                              className="w-16 h-8 px-2 text-center text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
                            />
                            <span className="text-[11px] text-slate-500">bản</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* THÊM ĐỊA ĐIỂM TÙY CHỌN MỚI */}
          <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Nhập tên địa điểm mới..."
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-slate-600">Số bản:</span>
              <input
                type="number"
                min="1"
                max="10"
                value={newLocCopies}
                onChange={(e) => setNewLocCopies(parseInt(e.target.value) || 2)}
                className="w-16 h-9 px-2 text-center text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddNewLocConfig}
              className="h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition"
            >
              <PlusOutlined />
              <span>Thêm địa điểm</span>
            </button>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="submit"
              className="h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95"
            >
              <SaveOutlined />
              <span>Lưu cấu hình số bản in</span>
            </button>
          </div>
        </div>
      </form>

      {/* POPUP XEM TRƯỚC PHIẾU */}
      <DeliverySlipModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </div>
  );
};

