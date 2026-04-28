import type { ReactNode } from "react";

import { AppChrome } from "@/components/layout/app-chrome";

export default function RateLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <AppChrome>{children}</AppChrome>;
}
