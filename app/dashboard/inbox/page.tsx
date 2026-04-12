import { Suspense } from "react";
import { InboxWithTabs } from "./inbox-with-tabs";

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxWithTabs />
    </Suspense>
  );
}
