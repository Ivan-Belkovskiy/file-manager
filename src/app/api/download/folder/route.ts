import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { existsSync } from "fs";
import { ZipArchive } from 'archiver';

export async function GET(req: NextRequest) {
    const folderPath = req.nextUrl.searchParams.get('path');
    const folderName = req.nextUrl.searchParams.get('name');

    if (!folderPath || !folderName) {
        return NextResponse.json({ success: false, error: 'Path or name not provided!' }, { status: 400 });
    }

    try {
        const targetDir = path.join(decodeURIComponent(folderPath), decodeURIComponent(folderName));

        if (!existsSync(targetDir)) {
            return NextResponse.json({ success: false, error: 'Folder not exists!' }, { status: 404 });
        }

        const stream = new ReadableStream({
            start(controller) {
                const archive = new ZipArchive({
                    zlib: {
                        level: 9
                    }
                });

                archive.on('error', (err) => {
                    console.error('Archiver error:', err);
                    controller.error(err);
                });

                archive.on('data', (chunk) => {
                    controller.enqueue(chunk);
                });

                archive.on('end', () => {
                    controller.close();
                });

                archive.directory(targetDir, false);

                archive.finalize();
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(folderName)}.zip`,
                'Content-Type': 'application/zip',
            },
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}