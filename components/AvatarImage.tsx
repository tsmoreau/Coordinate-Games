'use client';

import { useState } from 'react';

interface AvatarImageProps {
  gameSlug: string;
  avatarId: string | null;
  displayName: string;
  size?: number;
  className?: string;
  avatarUrl?: string | null;
}

function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 55%)`;
}

function FallbackAvatar({ displayName, size }: { displayName: string; size: number }) {
  const letter = (displayName?.[0] || '?').toUpperCase();
  const color = hashStringToColor(displayName || 'unknown');
  const fontSize = size * 0.45;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="white"
        fontSize={fontSize}
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        {letter}
      </text>
    </svg>
  );
}

export default function AvatarImage({
  gameSlug,
  avatarId,
  displayName,
  size = 40,
  className = '',
  avatarUrl,
}: AvatarImageProps) {
  const [error, setError] = useState(false);

  if (!avatarId || error) {
    return (
      <span className={`inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
        <FallbackAvatar displayName={displayName} size={size} />
      </span>
    );
  }

  const src = avatarUrl || `/api/avatars/${gameSlug}/${avatarId}`;

  return (
    <img
      src={src}
      alt={`${displayName} avatar`}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}
