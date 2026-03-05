"use client";

import dynamic from "next/dynamic";

const CookieConsent = dynamic(
  () => import("./CookieConsent").then((m) => m.CookieConsent),
  { ssr: false }
);

interface CookieConsentWrapperProps {
  message?: string;
  privacyUrl?: string;
}

export function CookieConsentWrapper({ message, privacyUrl }: CookieConsentWrapperProps) {
  return <CookieConsent message={message} privacyUrl={privacyUrl} />;
}
