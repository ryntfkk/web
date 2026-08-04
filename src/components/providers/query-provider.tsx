"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { installAnalyticsSink } from "@/lib/analytics-sink";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Dipasang sekali di klien. No-op bila NEXT_PUBLIC_ANALYTICS_ENDPOINT belum
  // diisi — build yang belum dikonfigurasi tidak mengirim apa pun ke mana pun.
  useEffect(() => {
    installAnalyticsSink();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
