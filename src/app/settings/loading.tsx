import { Card, CardContent } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="animate-pulse space-y-6">
        <div>
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
