"use client";

// Cascading dropdown Provinsi → Kota/Kabupaten → Kecamatan.
// Melaporkan NAMA (bukan kode) ke parent agar cocok dengan kolom TEXT di DB.
// Mendukung prefill saat edit: kode di-resolve dari nama tersimpan.
import { useEffect, useMemo, useState } from 'react';
import {
  getProvinces,
  getRegencies,
  getDistricts,
  findProvinceByName,
  findRegencyByName,
  type Region,
} from '@/lib/regions';

export interface RegionValue {
  province: string;
  city: string;
  district: string;
}

interface RegionSelectProps {
  value: RegionValue;
  onChange: (v: RegionValue) => void;
  disabled?: boolean;
  /** Kelas untuk setiap <select> agar menyatu dengan gaya form. */
  selectClassName?: string;
  /** Kelas untuk setiap <label>. */
  labelClassName?: string;
}

const DEFAULT_SELECT =
  'w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] bg-white focus:outline-none focus:border-[#b51822]';
const DEFAULT_LABEL = 'block text-sm font-semibold text-[#1c1b1b] mb-2';

export default function RegionSelect({
  value,
  onChange,
  disabled,
  selectClassName = DEFAULT_SELECT,
  labelClassName = DEFAULT_LABEL,
}: RegionSelectProps) {
  const provinces = useMemo(() => getProvinces(), []);
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [districts, setDistricts] = useState<Region[]>([]);

  // Resolve provinceCode dari nama tersimpan (prefill edit / kontrol eksternal).
  useEffect(() => {
    setProvinceCode(findProvinceByName(value.province)?.code ?? '');
  }, [value.province]);

  const regencies = useMemo(
    () => (provinceCode ? getRegencies(provinceCode) : []),
    [provinceCode],
  );

  // Resolve cityCode setelah provinceCode & daftar kota siap.
  useEffect(() => {
    setCityCode(provinceCode ? findRegencyByName(provinceCode, value.city)?.code ?? '' : '');
  }, [provinceCode, value.city]);

  // Lazy-load kecamatan saat kota terpilih.
  useEffect(() => {
    let active = true;
    if (provinceCode && cityCode) {
      getDistricts(provinceCode, cityCode).then((d) => {
        if (active) setDistricts(d);
      });
    } else {
      setDistricts([]);
    }
    return () => {
      active = false;
    };
  }, [provinceCode, cityCode]);

  const districtCode = useMemo(() => {
    const n = value.district.trim().toLowerCase();
    return districts.find((d) => d.name.toLowerCase() === n)?.code ?? '';
  }, [districts, value.district]);

  const handleProvince = (code: string) => {
    const p = provinces.find((x) => x.code === code);
    setProvinceCode(code);
    setCityCode('');
    setDistricts([]);
    onChange({ province: p?.name ?? '', city: '', district: '' });
  };

  const handleCity = (code: string) => {
    const r = regencies.find((x) => x.code === code);
    setCityCode(code);
    onChange({ ...value, city: r?.name ?? '', district: '' });
  };

  const handleDistrict = (code: string) => {
    const d = districts.find((x) => x.code === code);
    onChange({ ...value, district: d?.name ?? '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClassName}>Provinsi</label>
        <select
          className={selectClassName}
          value={provinceCode}
          onChange={(e) => handleProvince(e.target.value)}
          disabled={disabled}
        >
          <option value="">Pilih Provinsi</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClassName}>Kota / Kabupaten</label>
          <select
            className={selectClassName}
            value={cityCode}
            onChange={(e) => handleCity(e.target.value)}
            disabled={disabled || !provinceCode}
          >
            <option value="">{provinceCode ? 'Pilih Kota' : 'Pilih provinsi dulu'}</option>
            {regencies.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClassName}>Kecamatan</label>
          <select
            className={selectClassName}
            value={districtCode}
            onChange={(e) => handleDistrict(e.target.value)}
            disabled={disabled || !cityCode}
          >
            <option value="">{cityCode ? 'Pilih Kecamatan' : 'Pilih kota dulu'}</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
