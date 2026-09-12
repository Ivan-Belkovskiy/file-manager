import { createReadStream, existsSync, statSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(req: NextRequest) {
    try {
        // const params = new URLSearchParams(req.url);
        const filepath = req.nextUrl.searchParams.get('path');
        const filename = req.nextUrl.searchParams.get('filename');
        if (!filepath || !filename) return NextResponse.json({ success: false, error: 'File path or filename not provided!' });

        const fullPath = path.join(decodeURIComponent(filepath), decodeURIComponent(filename));

        if (!existsSync(fullPath)) return NextResponse.json({ success: false, error: 'File not exists!' });

        const file = createReadStream(fullPath);
        const stat = statSync(fullPath);

        const fileName = path.basename(fullPath);

        return new NextResponse(file as any, {
            headers: {
                'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
                'Content-Type': 'application/octet-stream',
                'Content-Length': stat.size.toString(),
            },
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error,
        })
    }
}