import { Suspense } from "react";
import { StudioClient } from "@/components/studio/StudioClient";

export const metadata = { title: "Studio · RC Beam Fire Studio" };

export default function StudioPage() {
  return (
    <Suspense>
      <StudioClient />
    </Suspense>
  );
}
