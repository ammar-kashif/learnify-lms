'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface ChartPlaceholderProps {
  title: string;
  description: string;
  chartType?: 'line' | 'bar' | 'pie';
  data?: any[];
}

export default function ChartPlaceholder({
  title,
  description,
  chartType = 'line',
  data = [],
}: ChartPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <TrendingUp className="mr-2 h-4 w-4" />
              Week
            </Button>
            <Button variant="outline" size="sm">
              <TrendingDown className="mr-2 h-4 w-4" />
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-[300px] items-center justify-center rounded-lg bg-muted">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {chartType === 'line' && 'Line chart will be displayed here'}
              {chartType === 'bar' && 'Bar chart will be displayed here'}
              {chartType === 'pie' && 'Pie chart will be displayed here'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Using Recharts library for data visualization
            </p>
            {data.length > 0 && (
              <div className="mt-4 rounded border bg-background p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Sample Data:
                </p>
                <div className="space-y-1 text-xs">
                  {data.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.label || `Item ${index + 1}`}:</span>
                      <span className="font-medium">{item.value || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
