import { useAuth } from "@/features/auth/hooks/use-auth";
import InfluencerDashboard from "./influencer-dashboard";
import BusinessDashboard from "./business-dashboard";

export default function CreatorDashboard() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.accountType === "influencer") {
    return <InfluencerDashboard />;
  }

  return <BusinessDashboard />;
}
