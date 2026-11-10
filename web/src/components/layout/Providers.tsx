"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { metaQuery } from "@/hooks/useFeatureMeta";
import { markWarmupStart } from "@/lib/warmup";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  // Wake the API as soon as anyone lands on any page, and keep the model metadata
  // ready, so the studio is usually warm by the time it's opened.
  useEffect(() => {
    markWarmupStart();
    queryClient.prefetchQuery(metaQuery);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
