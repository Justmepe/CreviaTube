import { ClipperDirectory } from '@/features/reviews/ClipperDirectory';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function ClipperDirectoryPage() {
  const { user } = useAuth();

  if (!user || user.role !== 'creator') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Creator Access Required</h2>
            <p className="text-gray-600">
              Only creators can access the clipper directory for hiring.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ClipperDirectory />
    </div>
  );
}