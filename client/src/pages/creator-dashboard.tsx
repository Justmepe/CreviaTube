import { useAuth } from "@/hooks/use-auth";
import TraderCreatorDashboard from "./trader-creator-dashboard";
import InfluencerDashboard from "./influencer-dashboard";
import EntrepreneurDashboard from "./entrepreneur-dashboard";

export default function CreatorDashboard() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  // Route to specialized dashboard based on user type
  switch (user.userType) {
    case "trader_creator":
      return <TraderCreatorDashboard />;
    case "influencer":
      return <InfluencerDashboard />;
    case "entrepreneur":
      return <EntrepreneurDashboard />;
    case "enterprise":
      return <EntrepreneurDashboard />; // Enterprise users use entrepreneur dashboard
    default:
      return <TraderCreatorDashboard />; // Default to trading dashboard
  }
}


