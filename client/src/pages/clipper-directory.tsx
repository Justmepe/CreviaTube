import { ClipperDirectory } from '@/features/reviews/ClipperDirectory';
import { DashboardLayout } from '@/components/dashboard-layout';

// Auth-only gate: any signed-in user can browse the leaderboard. Creators
// use it for hiring; clippers use it as a motivational ranking — seeing
// where they sit + who's at the top is a retention loop.
export default function ClipperDirectoryPage() {
  return (
    <DashboardLayout title="Clipper Leaderboard">
      <ClipperDirectory />
    </DashboardLayout>
  );
}