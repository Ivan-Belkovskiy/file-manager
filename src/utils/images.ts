import { FolderEntry } from "@/app/actions";

export const getImageForDirEntry = (entry: FolderEntry | { isDirectory?: undefined; name: string; }) => {
    if (entry.isDirectory) return "/images/navigation/folder.svg";

    const ext = entry.name.split('.').pop();

    let extensionMap: Record<string, string> = {
        "png": "/images/navigation/image_file.svg",
        "jpg": "/images/navigation/image_file.svg",
        "bmp": "/images/navigation/image_file.svg",
        "svg": "/images/navigation/svg_file.svg",
        "zip": "/images/navigation/7zip_archive.svg",
        "mp3": "/images/navigation/audiofile_mp3.svg",
        "m4a": "/images/navigation/audiofile_m4a.svg",
        "wav": "/images/navigation/audiofile_wav.svg",
        "mp4": "/images/navigation/videofile.svg",
        "avi": "/images/navigation/videofile.svg",
        "mov": "/images/navigation/videofile.svg",
        "sb3": "/images/navigation/sb3_project.svg",
        "txt": "/images/navigation/textfile.svg"
    }

    if (!ext || !extensionMap[ext]) return "/images/navigation/unknown_filetype.svg";

    return extensionMap[ext];
    
}