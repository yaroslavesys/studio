'use client';

import { useState, useEffect } from 'react';

// This component safely renders a date on the client side
// to avoid hydration mismatch errors.
export function SafeDate({ date }: { date: Date | undefined | null }) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // This code runs only on the client, after hydration
    if (date) {
      setFormattedDate(
        date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    }
  }, [date]);

  // Render a placeholder on the server and initial client render
  if (!formattedDate) {
    return null; // Or a loading skeleton
  }

  return <>{formattedDate}</>;
}
