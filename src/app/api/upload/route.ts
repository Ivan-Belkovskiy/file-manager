import { NextRequest, NextResponse } from "next/server";
import Busboy from "busboy";
import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 0;

function resolveSafePath(baseDir: string, relative: string): string | null {
    const rel = relative.replace(/\\/g, "/").replace(/^\/+/, "");
    const parts = rel.split("/").filter((p) => p && p !== "." && p !== "..");
    if (parts.length === 0) return null;

    const full = path.resolve(baseDir, ...parts);
    const base = path.resolve(baseDir);
    const relCheck = path.relative(base, full);
    if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) return null;

    return full;
}

export async function POST(request: NextRequest) {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
        return NextResponse.json(
            { success: false, error: "Invalid content-type" },
            { status: 400 }
        );
    }

    if (!request.body) {
        return NextResponse.json(
            { success: false, error: "Empty body" },
            { status: 400 }
        );
    }

    const nodeStream = Readable.fromWeb(request.body as any);

    const busboy = Busboy({
        headers: { "content-type": contentType },
        limits: {
            fileSize: 20 * 1024 * 1024 * 1024,
            files: 10000,                      
        },
    });

    const saved: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    const writePromises: Promise<void>[] = [];

    let baseDir = "";
    let baseDirReady = false;

    busboy.on("field", (name, val) => {
        if (name === "targetPath") {
            baseDir = path.normalize(val);
            mkdirSync(baseDir, { recursive: true });
            baseDirReady = true;
        }
    });

    busboy.on("file", (fieldname, fileStream, info) => {
        const relName = (info.filename || "unnamed").replace(/\\/g, "/");

        if (!baseDirReady) {
            fileStream.resume();
            skipped.push(relName);
            errors.push(`targetPath не получен до файла ${relName}`);
            return;
        }

        const fullPath = resolveSafePath(baseDir, relName);
        if (!fullPath) {
            fileStream.resume();
            skipped.push(relName);
            errors.push(`Недопустимый путь: ${relName}`);
            return;
        }

        mkdirSync(path.dirname(fullPath), { recursive: true });

        const writeStream = createWriteStream(fullPath);

        const p = pipeline(fileStream, writeStream)
            .then(() => {
                saved.push(path.relative(baseDir, fullPath).replace(/\\/g, "/"));
            })
            .catch((err) => {
                errors.push(`Ошибка записи ${relName}: ${err?.message ?? err}`);
            });

        writePromises.push(p);
    });

    busboy.on("limit", () => {
        errors.push("Превышен лимит размера файла");
    });

    try {
        await new Promise<void>((resolve, reject) => {
            busboy.on("finish", resolve);
            busboy.on("error", reject);
            nodeStream.on("error", reject);
            nodeStream.pipe(busboy);
        });

        await Promise.all(writePromises);
    } catch (err: any) {
        console.error("Upload stream error:", err);
        return NextResponse.json(
            { success: false, error: err?.message ?? "Upload failed" },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: errors.length === 0,
        files: saved,
        skipped,
        errors,
    });
}