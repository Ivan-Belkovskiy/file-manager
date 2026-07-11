import { NextRequest } from "next/server";
import { existsSync, readdirSync, createReadStream } from "fs";
import { createHash } from "crypto";
import path from "path";

function calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = createHash('sha256');
        const stream = createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get("path");

    if (!folderPath) {
        return new Response("Path not provided", { status: 400 });
    }

    const fullPath = path.normalize(folderPath);
    if (!existsSync(fullPath)) {
        return new Response("Folder not found", { status: 404 });
    }

    const encoder = new TextEncoder();

    const responseStream = new ReadableStream({
        async start(controller) {
            try {
                const folderContents = readdirSync(fullPath, {
                    recursive: true,
                    withFileTypes: true,
                });

                const files = folderContents.filter(ent => ent.isFile());
                const totalFiles = files.length;
                let processedFiles = 0;

                const checked: Record<string, { name: string; path: string; }> = {};
                const duplicates: Record<string, { name: string; path: string; }[]> = {};

                for (const ent of files) {
                    const parentDir = ent.parentPath || (ent as any).path;
                    const pathToFile = path.join(parentDir, ent.name);

                    try {
                        const hash = await calculateFileHash(pathToFile);

                        if (checked[hash]) {
                            if (!duplicates[hash]) {
                                duplicates[hash] = [checked[hash], { name: ent.name, path: parentDir }];
                            } else {
                                duplicates[hash].push({ name: ent.name, path: parentDir });
                            }
                        } else {
                            checked[hash] = { name: ent.name, path: parentDir };
                        }
                    } catch (fileError) {
                        console.error(`Ошибка файла ${pathToFile}:`, fileError);
                    }

                    processedFiles++;

                    const progressData = {
                        type: "progress",
                        current: processedFiles,
                        total: totalFiles,
                        percent: Math.round((processedFiles / totalFiles) * 100),
                    };
                    controller.enqueue(encoder.encode(JSON.stringify(progressData) + "\n"));
                }

                const finalData = {
                    type: "done",
                    duplicates,
                };
                controller.enqueue(encoder.encode(JSON.stringify(finalData) + "\n"));
                controller.close();

            } catch (err: any) {
                controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: err.message }) + "\n"));
                controller.close();
            }
        }
    });

    return new Response(responseStream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
        },
    });
}