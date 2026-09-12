'use server';

import { existsSync, readdirSync, createReadStream, mkdirSync, rmSync, rmdirSync, renameSync } from "fs";
import { createHash } from "crypto";
import path from "path";

export interface FolderEntry {
    name: string,
    parentPath?: string,
    isDirectory: boolean,
}

export interface LoadingError {
    type: string,
    message: string
}

export async function getNavigationData(filepath: string) {
    if (!filepath) return {
        success: false, error: {
            type: 'other',
            message: "Path not provided!"
        }
    };

    const normalizedPath = path.normalize(filepath);

    if (!existsSync(normalizedPath)) return {
        success: false, error: {
            type: 'not_found',
            message: "Directory not exists!"
        }
    };

    const data = readdirSync(normalizedPath, {
        withFileTypes: true,
    }).sort((a, b) => (
        (b.isDirectory()) ? 1 : -1 
    ));

    const resultData = data.map(ent => ({
        name: ent.name,
        parentPath: ent.parentPath,
        isDirectory: ent.isDirectory(),
    }));



    return { success: true, data: resultData, normalizedPath };

}

export async function enterFolder(currentPath: string, name: string) {
    if (!currentPath || !name) return {
        success: false, error: {
            type: 'other',
            message: "Path or name not provided!"
        }
    };

    const fullPath = path.join(currentPath, name);

    if (!existsSync(fullPath)) return {
        success: false, error: {
            type: "not_found",
            message: "Directory not exists!"
        }
    };

    return await getNavigationData(fullPath);
}

export async function openPreviousFolder(currentPath: string) {
    if (!currentPath) return {
        success: false, error: {
            type: 'other',
            message: "Path not provided!"
        }
    };

    const fullPath = path.normalize(`${currentPath}/..`);

    if (!existsSync(fullPath)) return {
        success: false, error: {
            type: "not_found",
            message: "Directory not exists!"
        }
    };

    return await getNavigationData(fullPath);
}

export async function createFolder(currentPath: string, newFolderName: string) {
    if (!currentPath || !newFolderName) return {
        success: false, error: {
            type: 'other',
            message: "Path or new folder name not provided!"
        }
    };

    const fullPath = path.join(currentPath, newFolderName);

    if (existsSync(fullPath)) return {
        success: false, error: {
            type: "already_exists",
            message: "Directory is already exists!"
        }
    };

    mkdirSync(fullPath);

    return await getNavigationData(currentPath);
}

export async function deleteFolder(currentPath: string, folderName: string) {
    if (!currentPath || !folderName) return {
        success: false, error: {
            type: 'other',
            message: "Path or new folder name not provided!"
        }
    };

    const fullPath = path.join(currentPath, folderName);

    if (!existsSync(fullPath)) return {
        success: false, error: {
            type: "not_exists",
            message: "Directory does not exists!"
        }
    };

    rmdirSync(fullPath);

    return await getNavigationData(currentPath);
}


export async function renameFileOrFolder(entry: FolderEntry, nPath: string) {
    if (!entry.parentPath || !nPath) return {
        success: false, error: {
            type: 'other',
            message: "Old data or new path not provided!"
        }
    };

    const oldPath = path.join(entry.parentPath, entry.name);
    const newPath = path.join(nPath, entry.name);

    if (!existsSync(oldPath)) return {
        success: false, error: {
            type: "not_exists",
            message: "Directory does not exists!"
        }
    };

    renameSync(oldPath, newPath);

    return await getNavigationData(nPath);
}

function calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = createHash('sha256');
        const stream = createReadStream(filePath);

        stream.on('data', (data) => {
            hash.update(data);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

export async function checkDuplicates(folderPath: string) {
    if (!folderPath) return {
        success: false, error: {
            type: 'other', 
            message: 'Path not provided!'
        }
    };

    try {
        const fullPath = path.normalize(folderPath);

        if (!existsSync(fullPath)) {
            return { success: false, error: { type: "not_found", message: "Folder not exists!" } };
        }

        const folderContents = readdirSync(fullPath, {
            recursive: true,
            withFileTypes: true,
        });

        const checked: Record<string, { name: string; path: string; }> = {};
        const duplicates: Record<string, { name: string; path: string; }[]> = {};

        for (const ent of folderContents) {
            if (ent.isFile()) {
                const parentDir = ent.parentPath || ent.path; 
                const pathToFile = path.join(parentDir, ent.name);

                try {
                    const hash = await calculateFileHash(pathToFile);

                    if (checked[hash]) {
                        if (!duplicates[hash]) {
                            duplicates[hash] = [
                                checked[hash],
                                { name: ent.name, path: parentDir }
                            ];
                        } else {
                            duplicates[hash].push({
                                name: ent.name,
                                path: parentDir,
                            });
                        }
                    } else {
                        checked[hash] = {
                            name: ent.name,
                            path: parentDir,
                        };
                    }
                } catch (fileError) {
                    console.error(`Ошибка при чтении файла ${pathToFile}:`, fileError);
                    continue; 
                }
            }
        }

        return { success: true, duplicates };

    } catch (error: any) {
        return {
            success: false, error: {
                type: 'other',
                message: error?.message || String(error),
            }
        };
    }
}