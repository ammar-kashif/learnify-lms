'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  data = []
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
              <TrendingUp className="h-4 w-4 mr-2" />
              Week
            </Button>
            <Button variant="outline" size="sm">
              <TrendingDown className="h-4 w-4 mr-2" />
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground font-medium">{title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {chartType === 'line' && 'Line chart will be displayed here'}
              {chartType === 'bar' && 'Bar chart will be displayed here'}
              {chartType === 'pie' && 'Pie chart will be displayed here'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Using Recharts library for data visualization
            </p>
            {data.length > 0 && (
              <div className="mt-4 p-3 bg-background rounded border">
                <p className="text-xs text-muted-foreground mb-2">Sample Data:</p>
                <div className="text-xs space-y-1">
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
