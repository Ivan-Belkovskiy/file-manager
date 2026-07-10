'use server';

import { error } from "console";
import { createHash } from "crypto";
import { existsSync, readdirSync, readFileSync } from "fs";
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

export async function checkDuplicates(folderPath: string) {
    if (!folderPath) return {
        success: false, error: {
            type: 'other', 
            message: 'Path not provided!'
        }
    };
    try {

        const fullPath = path.normalize(folderPath);

        if (!existsSync(fullPath)) return { success: false, error: { type: "not_found", message: "Folder not exists!" } };

        const folderContents = readdirSync(fullPath, {
            recursive: true,
            withFileTypes: true,
        });

        const checked: Record<string, {
            name: string;
            path: string;
        }> = {};

        const duplicates: Record<string, {
            name: string;
            path: string;
        }[]> = {};

        folderContents.forEach(ent => {
            if (ent.isFile()) {
                const pathToFile = path.join(ent.parentPath, ent.name);
                const buffer = readFileSync(pathToFile);
                const hash = createHash('sha256').update(buffer).digest('hex');

                if (checked[hash]) {
                    if (!duplicates[hash]) duplicates[hash] = [];

                    duplicates[hash].push(checked[hash], {
                        name: ent.name,
                        path: ent.parentPath,
                    });
                }

                checked[hash] = {
                    name: ent.name,
                    path: ent.parentPath,
                };
            }
        });

        return { success: true, duplicates };


    } catch (error) {
        return {
            success: false, error: {
                type: 'other',
                message: error,
            }
        }
    }
}