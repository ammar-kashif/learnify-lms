'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Toggle theme"
        className="text-charcoal-700 hover:bg-primary/10 hover:text-primary"
        onClick={() => {
          const prefersDark = document.documentElement.classList.contains('dark');
          setTheme(prefersDark ? 'light' : 'dark');
        }}
      >
        <Moon className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = (resolvedTheme || theme) === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="text-charcoal-700 hover:bg-primary/10 hover:text-primary"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
