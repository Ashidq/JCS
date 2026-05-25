"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-gray-100 shadow-sm">
      
      {/* CONTENT */}
      <div className="flex items-center justify-between px-6 py-3">
        
        {/* LEFT */}
        <div className="flex items-center gap-3">
          
          {/* ICON */}
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
            <Image 
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>

          {/* TITLE */}
          <h1 className="text-[#2B4C7E] font-bold text-lg">
            Jujurly Canteen System
          </h1>
        </div>

        {/* RIGHT */}
        <div className="text-sm font-bold text-[#2B4C7E] flex items-center gap-2">
          <span>KWU</span>
          <span className="text-yellow-400">●</span>
          <span>HMIT</span>
        </div>

      </div>

      {/* BOTTOM LINE */}
      <div className="h-[3px] bg-[#487ADB]"></div>

    </header>
  );
}