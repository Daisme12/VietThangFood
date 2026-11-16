import React from 'react';
import { useInventoryOverview } from '../hooks/useInventory';
import { formatQuantity } from '../../../lib/formatters';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';

export const InventoryOverview: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useInventoryOverview();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-12 w-full animate-pulse rounded bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="font-semibold text-rose-900">
          {error instanceof Error
            ? error.message
            : 'Không thể tải dữ liệu tồn kho.'}
        </p>
        <div className="mt-3">
          <Button variant="danger" size="sm" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const products = data?.products ?? [];
  const materials = data?.materials ?? [];

  return (
    <div className="space-y-6">
      {/* Tồn kho Thành phẩm */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-base font-bold text-slate-900">
          Tồn Kho Thành Phẩm (Finished Products)
        </h3>
        {products.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Chưa có dữ liệu thành phẩm trong kho.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Mã SP</th>
                  <th className="px-4 py-3">Tên thành phẩm</th>
                  <th className="px-4 py-3 text-right">Tồn vật lý</th>
                  <th className="px-4 py-3 text-right">Đang giữ (Approved)</th>
                  <th className="px-4 py-3 text-right">Tồn khả dụng</th>
                  <th className="px-4 py-3">Cảnh báo định mức an toàn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => (
                  <tr key={prod.productId}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {prod.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {prod.name}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatQuantity(prod.physicalQty)} {prod.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700">
                      {formatQuantity(prod.reservedQty)} {prod.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {formatQuantity(prod.availableQty)} {prod.unit}
                    </td>
                    <td className="px-4 py-3">
                      {prod.isBelowSafetyStock ? (
                        <StatusBadge
                          color="red"
                          label={`Dưới ngưỡng an toàn (${formatQuantity(prod.safetyStock)})`}
                          pulse
                        />
                      ) : (
                        <StatusBadge color="green" label="An toàn" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tồn kho Nguyên vật liệu */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-base font-bold text-slate-900">
          Tồn Kho Nguyên Vật Liệu (Raw Materials - BOM)
        </h3>
        {materials.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Chưa có dữ liệu nguyên vật liệu trong kho.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Mã NL</th>
                  <th className="px-4 py-3">Tên nguyên liệu</th>
                  <th className="px-4 py-3 text-right">Tồn vật lý</th>
                  <th className="px-4 py-3 text-right">Đang giữ cho SX</th>
                  <th className="px-4 py-3 text-right">Tồn khả dụng</th>
                  <th className="px-4 py-3">Trạng thái tồn tối thiểu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.map((mat) => (
                  <tr key={mat.materialId}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {mat.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {mat.name}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatQuantity(mat.physicalQty)} {mat.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700">
                      {formatQuantity(mat.reservedQty)} {mat.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {formatQuantity(mat.availableQty)} {mat.unit}
                    </td>
                    <td className="px-4 py-3">
                      {mat.isBelowMinStock ? (
                        <StatusBadge
                          color="red"
                          label={`Cần nhập thêm (< ${formatQuantity(mat.minStock)})`}
                          pulse
                        />
                      ) : (
                        <StatusBadge color="green" label="Đủ định mức" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

