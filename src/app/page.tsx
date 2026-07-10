import FileNavigation from "@/components/FileNavigation/FileNavigation";
import Image from "next/image";
import "./page.css";

export default function Home() {
  return (
    <div className="app-container">
      <h1>Next.js Interactive File Manager</h1>
      <FileNavigation />
    </div>
  );
}
