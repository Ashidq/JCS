"use client";

import { FaInstagram, FaTiktok } from "react-icons/fa";

export default function Footer() {
  return (
<<<<<<< HEAD
    <footer className="bg-[#487ADB] text-white px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4">

        {/* LEFT - SOCIAL MEDIA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm">
          <div className="flex items-center gap-3">
=======
    <footer className="bg-[#487ADB] text-white px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* LEFT - SOCIAL MEDIA */}
        <div className="flex items-center gap-20 text-sm">
          <div className="flex items-center gap-5">
>>>>>>> cf6c3ba117aebbffaff69a214ab9071a4e84e33d
            <div className="bg-white text-[#487ADB] rounded-full p-2 shadow-md hover:scale-110 transition">
              <FaTiktok size={16} />
            </div>
            <span>@hmit.store</span>
          </div>
<<<<<<< HEAD

          <div className="flex items-center gap-3">
=======
          <div className="flex items-center gap-5">
>>>>>>> cf6c3ba117aebbffaff69a214ab9071a4e84e33d
            <div className="bg-white text-[#487ADB] rounded-full p-2 shadow-md hover:scale-110 transition">
              <FaInstagram size={16} />
            </div>
            <span>@hmit.store</span>
<<<<<<< HEAD
          </div>
        </div>

        {/* CENTER - PROJECT */}
        <div className="text-sm font-medium text-center">
=======
            </div>
        </div>

        {/* CENTER - PROJECT */}
        <div className="text-sm font-medium">
>>>>>>> cf6c3ba117aebbffaff69a214ab9071a4e84e33d
          Project Capstone
        </div>

        {/* RIGHT - TEAM */}
<<<<<<< HEAD
        <div className="flex flex-wrap justify-center items-center gap-2 text-sm">
=======
        <div className="text-sm flex gap-5">
>>>>>>> cf6c3ba117aebbffaff69a214ab9071a4e84e33d
          <span>Wira</span>
          <span>|</span>
          <span>Abid</span>
          <span>|</span>
          <span>Satya</span>
          <span>|</span>
          <span>Syahmi</span>
        </div>

      </div>
    </footer>
  );
}