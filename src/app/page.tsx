import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { SocialProof } from "@/components/landing/SocialProof";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <SocialProof />
      <Footer />
    </>
  );
}
