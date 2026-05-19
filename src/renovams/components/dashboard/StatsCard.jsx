import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const colorMap = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  gray: 'bg-gray-50 text-gray-500 border-gray-100',
  red: 'bg-red-50 text-red-600 border-red-100',
};

export default function StatsCard({ label, value, icon: Icon, color = 'blue', loading }) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            {loading ? <Skeleton className="h-8 w-16 mt-2" /> : <p className="text-3xl font-bold text-foreground mt-1">{value}</p>}
          </div>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}