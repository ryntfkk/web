"use client";

import { cn } from '@/lib/utils';
import {
  Clock, Package, CheckCircle, XCircle, AlertTriangle,
  CreditCard, Wrench, HelpCircle, DollarSign
} from 'lucide-react';

export type OrderStatus =
  | 'WAITING_CONFIRMATION'
  | 'WAITING_PAYMENT'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'WAITING_ADDITIONAL_PAY'
  | 'WAITING_CUSTOMER_CONFIRM'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}

// Semua warna status memakai token brand (globals.css @theme) . dilarang hex/class liar.
const STATUS_MAP: Record<OrderStatus, StatusConfig> = {
  WAITING_CONFIRMATION: {
    label: 'Menunggu Konfirmasi',
    color: 'text-brand-amber-dark',
    bg: 'bg-brand-warning-light border-brand-warning/40',
    icon: Clock,
  },
  WAITING_PAYMENT: {
    label: 'Menunggu Pembayaran',
    color: 'text-brand-orange-dark',
    bg: 'bg-brand-orange-light border-brand-orange/40',
    icon: CreditCard,
  },
  PAID: {
    label: 'Dibayar',
    color: 'text-brand-info-dark',
    bg: 'bg-brand-info-light border-brand-info/40',
    icon: CheckCircle,
  },
  IN_PROGRESS: {
    label: 'Sedang Dikerjakan',
    color: 'text-brand-blue-dark',
    bg: 'bg-brand-blue-light border-brand-blue/40',
    icon: Wrench,
  },
  WAITING_ADDITIONAL_PAY: {
    label: 'Tagihan Tambahan',
    color: 'text-brand-purple-dark',
    bg: 'bg-brand-purple-light border-brand-purple/40',
    icon: DollarSign,
  },
  WAITING_CUSTOMER_CONFIRM: {
    label: 'Menunggu Konfirmasimu',
    color: 'text-brand-info-dark',
    bg: 'bg-brand-blue-50 border-brand-blue/30',
    icon: HelpCircle,
  },
  COMPLETED: {
    label: 'Selesai',
    color: 'text-brand-success-dark',
    bg: 'bg-brand-success-light border-brand-success/40',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Dibatalkan',
    color: 'text-brand-error-dark',
    bg: 'bg-brand-error-light border-brand-error/40',
    icon: XCircle,
  },
  DISPUTED: {
    label: 'Sengketa',
    color: 'text-brand-error-dark',
    bg: 'bg-brand-error-soft border-brand-error/60',
    icon: AlertTriangle,
  },
};

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({
  status,
  size = 'md',
  className,
  showIcon = true,
}: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? {
    label: status,
    color: 'text-brand-gray-700',
    bg: 'bg-brand-gray-60 border-brand-gray-100',
    icon: Package,
  };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold border rounded-sm',
        config.color,
        config.bg,
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-xs px-2.5 py-1',
        size === 'lg' && 'text-sm px-3 py-1.5',
        className
      )}
    >
      {showIcon && <Icon className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />}
      {config.label}
    </span>
  );
}

export { STATUS_MAP };
