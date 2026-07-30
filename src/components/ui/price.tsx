import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

interface PriceProps {
  price: number;
  /** Harga sebelum diskon. Bila lebih besar dari `price`, tampil dicoret + badge %. */
  originalPrice?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const priceSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
} as const;

const strikeSizes = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm",
} as const;

/** Tampilan harga standar: harga aktif + harga coret + badge persen diskon. */
export function Price({ price, originalPrice, size = "md", className }: PriceProps) {
  const hasDiscount = typeof originalPrice === "number" && originalPrice > price;
  const discountPct = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn("font-bold text-brand-red", priceSizes[size])}>{formatRupiah(price)}</span>
      {hasDiscount && (
        <>
          <span className={cn("text-brand-gray-400 line-through", strikeSizes[size])}>
            {formatRupiah(originalPrice)}
          </span>
          <Badge variant="discount">-{discountPct}%</Badge>
        </>
      )}
    </div>
  );
}
