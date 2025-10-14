'use client';

import Image from 'next/image';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center justify-center">
        <Image
          src="https://rvrengineering.com/wp-content/uploads/2022/12/RVR.svg"
          alt="RVR Logo"
          width={48}
          height={48}
          className="h-12 w-auto"
        />
      </div>
      
    </div>
  );
}
