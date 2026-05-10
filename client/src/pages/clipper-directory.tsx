import { ClipperDirectory } from '@/features/reviews/ClipperDirectory';
import { DashboardLayout } from '@/components/dashboard-layout';

// Auth-only gate: any signed-in user can browse the leaderboard. Creators
// use it for hiring; clippers use it as a motivational ranking — seeing
// where they sit + who's at the top is a retention loop.
export default function ClipperDirectoryPage() {
  // Title intentionally omitted — ClipperDirectory renders its own h1
  // and a viewer-aware description; a layout title would duplicate it.
  return (
    <DashboardLayout>
      <ClipperDirectory />
    </DashboardLayout>
  );
}