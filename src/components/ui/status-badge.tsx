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

const STATUS_MAP: Record<OrderStatus, StatusConfig> = {
  WAITING_CONFIRMATION: {
    label: 'Menunggu Konfirmasi',
    color: 'text-yellow-800',
    bg: 'bg-yellow-100 border-yellow-200',
    icon: Clock,
  },
  WAITING_PAYMENT: {
    label: 'Menunggu Pembayaran',
    color: 'text-orange-800',
    bg: 'bg-orange-100 border-orange-200',
    icon: CreditCard,
  },
  PAID: {
    label: 'Dibayar',
    color: 'text-blue-800',
    bg: 'bg-blue-100 border-blue-200',
    icon: CheckCircle,
  },
  IN_PROGRESS: {
    label: 'Sedang Dikerjakan',
    color: 'text-purple-800',
    bg: 'bg-purple-100 border-purple-200',
    icon: Wrench,
  },
  WAITING_ADDITIONAL_PAY: {
    label: 'Tagihan Tambahan',
    color: 'text-amber-800',
    bg: 'bg-amber-100 border-amber-200',
    icon: DollarSign,
  },
  WAITING_CUSTOMER_CONFIRM: {
    label: 'Menunggu Konfirmasimu',
    color: 'text-indigo-800',
    bg: 'bg-indigo-100 border-indigo-200',
    icon: HelpCircle,
  },
  COMPLETED: {
    label: 'Selesai',
    color: 'text-green-800',
    bg: 'bg-green-100 border-green-200',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Dibatalkan',
    color: 'text-red-800',
    bg: 'bg-red-100 border-red-200',
    icon: XCircle,
  },
  DISPUTED: {
    label: 'Sengketa',
    color: 'text-red-900',
    bg: 'bg-red-200 border-red-300',
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
    color: 'text-gray-800',
    bg: 'bg-gray-100 border-gray-200',
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
