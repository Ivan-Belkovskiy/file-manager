'use client';

import { checkDuplicates, createFolder, deleteFolder, enterFolder, FolderEntry, getNavigationData, LoadingError, openPreviousFolder, renameFileOrFolder } from "@/app/actions";
import "./FileNavigation.css";
import { MouseEvent, useEffect, useRef, useState } from "react";
import { getImageForDirEntry } from "@/utils/images";
import ContextMenu, { ContextMenuItem, MEvent } from "../ContextMenu/ContextMenu";
import { getWordEndingByNumber } from "@/utils/string";
import SimpleModal from "../UI/SimpleModal/SimpleModal";

export interface FileNavigationProps {
    initialPath?: string;
}

export type NavigationAction = {
    type: 'navigation';

} | {
    type: 'duplicateCheck';
    error?: any;
    duplicates?: Record<string, {
        name: string;
        path: string;
    }[]>;
    collapsedGroups?: Record<string, boolean>;
}

export default function FileNavigation({ initialPath = "D:/" }: FileNavigationProps) {

    const [isLoading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState<LoadingError>();
    const [data, setData] = useState<FolderEntry[]>([]);

    const [selectedItem, setSelectedItem] = useState<FolderEntry | null>(null);

    const [action, setAction] = useState<NavigationAction>({
        type: 'navigation',
    });

    const [currentPath, setCurrentPath] = useState(initialPath);

    const contentRef = useRef<HTMLDivElement | null>(null);

    const [isContextMenuOpen, setContextMenuOpen] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);

    const [ctxMenuCurrentDir, setCtxMenuCurrentDir] = useState<FolderEntry | null>(null);


    const activateContextMenuRef = useRef<((e: MouseEvent | MEvent) => void) | null>(null);
    const closeContextMenuRef = useRef<(() => void) | null>(null);

    const [openedModal, setOpenedModal] = useState<'add-folder' | {
        type: "delete-folder";
        folder: FolderEntry;
    } | null>(null);

    const loadData = async () => {
        setLoading(true);
        const res = await getNavigationData(currentPath);

        if (res.success && res.data) {
            setData(res.data);
            setCurrentPath(res.normalizedPath);
        } else {
            setLoadingError(res.error);
        }
        setLoading(false);
    }

    const handleEntryClick = async (e: MouseEvent<HTMLDivElement>, ent: FolderEntry) => {
        if (action.type !== 'navigation') return;
        if (isLoading) return;
        const res = await enterFolder(currentPath, ent.name);

        if (res.success && res.data) {
            setData(res.data);
            setCurrentPath(res.normalizedPath);
        } else {
            setLoadingError(res.error);
        }
        setLoading(false);
    }

    const handleEntryRightClick = (e: MouseEvent<HTMLDivElement>, ent: FolderEntry) => {

        setCtxMenuCurrentDir(ent);
        activateContextMenuRef.current?.(e);
    }

    const handleBackButton = async () => {
        if (action.type === 'navigation') {
            if (isLoading) return;
            const res = await openPreviousFolder(currentPath);

            if (res.success && res.data) {
                setData(res.data);
                setCurrentPath(res.normalizedPath);
            } else {
                setLoadingError(res.error);
            }
            setLoading(false);
        } else if (action.type === 'duplicateCheck') {
            if (isLoading) return;
            setAction({
                type: 'navigation'
            });
            await loadData();
        }

    }

    const [progress, setProgress] = useState<{ current: number; total: number; percent: number } | null>(null);

    const handleDuplicateCheck = async () => {
        if (isLoading) return;

        setLoading(true);
        setAction({ type: 'duplicateCheck' });
        setProgress({ current: 0, total: 0, percent: 0 });

        try {
            const response = await fetch(`/api/duplicates?path=${encodeURIComponent(currentPath)}`);

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split("\n");

                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;

                    const data = JSON.parse(line);

                    if (data.type === "progress") {
                        setProgress({
                            current: data.current,
                            total: data.total,
                            percent: data.percent
                        });
                    } else if (data.type === "done") {
                        setAction({
                            type: 'duplicateCheck',
                            duplicates: data.duplicates,
                        });
                        setProgress(null);
                    } else if (data.type === "error") {
                        setLoadingError({ type: "other", message: data.message });
                    }
                }
            }

        } catch (err: any) {
            console.error("Ошибка стриминга:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFolder = async (name: string) => {
        if (action.type === 'navigation') {
            if (isLoading) return;
            // const name = prompt('Введите название папки:');
            if (!name) return;
            const res = await createFolder(currentPath, name);

            if (res.success && res.data) {
                setData(res.data);
                setCurrentPath(res.normalizedPath);
            } else {
                setLoadingError(res.error);
            }
            setLoading(false);
        }
    }

    const handleDeleteFolder = async (data: FolderEntry) => {
        if (action.type === 'navigation') {
            if (isLoading) return;
            if (!data.parentPath) return;
            const res = await deleteFolder(data.parentPath, data.name);

            if (res.success && res.data) {
                setData(res.data);
                setCurrentPath(res.normalizedPath);
            } else {
                setLoadingError(res.error);
            }
            setLoading(false);
        }
    }


    const enterFolderAndNext = async (ent: FolderEntry) => {
        const res = await enterFolder(currentPath, ent.name);

        if (res.success && res.data) {
            setData(res.data);
            setCurrentPath(res.normalizedPath);
        } else {
            setLoadingError(res.error);
        }
        setLoading(false);
    }

    const moveFileOrFolder = async (ent: FolderEntry, newPath: string) => {
        if (!ent.parentPath || !newPath) return;
        const res = await renameFileOrFolder(ent, newPath);

        if (res.success && res.data) {
            setData(res.data);
            setCurrentPath(res.normalizedPath);
        } else {
            setLoadingError(res.error);
        }
        setSelectedItem(null);
        setLoading(false);
    }

    const downloadFile = async (ent: FolderEntry) => {
        if (!ent.parentPath) return;
        try {
            // const res = await fetch(`/api/download?path=${encodeURIComponent(ent.parentPath)}&filename=${encodeURIComponent(ent.name)}`);
            const url = `/api/download?path=${encodeURIComponent(ent.parentPath)}&filename=${encodeURIComponent(ent.name)}`;

            const a = document.createElement('a');
            a.href = url;
            a.click();

            a.remove();

        } catch (error) {

        }
    }


    const downloadFolder = async (ent: FolderEntry) => {
        const folderParentPath = ent.parentPath || currentPath;

        try {
            const url = `/api/download/folder?path=${encodeURIComponent(folderParentPath)}&name=${encodeURIComponent(ent.name)}`;

            const a = document.createElement('a');
            a.href = url;
            a.style.display = 'none';
            document.body.appendChild(a);

            a.click();

            document.body.removeChild(a);

        } catch (error) {
            console.error("Ошибка скачивания папки:", error);
        }
    }

    useEffect(() => {
        loadData();
    }, [initialPath]);

    useEffect(() => {
        const contextMenuHandler = (e: MEvent) => {
            if (!contentRef.current) return;
            console.log('Context menu event:');
            console.log(e);

            // if ((e.currentTarget as HTMLElement).className === 'entry');

            setCtxMenuCurrentDir(null);
            activateContextMenuRef.current?.(e);

            // setContextMenuOpen(true);

            // setContextMenuPosition({
            //     x: e.clientX,
            //     y: e.clientY
            // });


            e.preventDefault();
            return false;
        }

        const windowClickHandler = () => {
            closeContextMenuRef.current?.();
        }

        if (typeof window !== 'undefined') window.addEventListener('click', windowClickHandler);

        contentRef.current?.addEventListener('contextmenu', contextMenuHandler);

        return () => {
            if (typeof window !== 'undefined') window.removeEventListener('click', windowClickHandler);
            contentRef.current?.removeEventListener('contextmenu', contextMenuHandler);
        }

    }, []);

    const displayText = (action.type === 'duplicateCheck') ? (
        `${(isLoading) ? 'ПОИСК НА ДУБЛИРОВАНИЕ ФАЙЛОВ' :
            (loadingError) ? 'ПОИСК НА ДУБЛИРОВАНИЕ ФАЙЛОВ - ОШИБКА!' :
                'РЕЗУЛЬТАТЫ ПОИСКА НА ДУБЛИРОВАНИЕ ФАЙЛОВ'
        }: ${currentPath}`
    ) : currentPath;


    const contextMenuItems: ContextMenuItem[] = (ctxMenuCurrentDir) ? (
        (ctxMenuCurrentDir.isDirectory) ? [
            {
                type: "button",
                label: "Перейти в папку",
                onClick: () => enterFolderAndNext(ctxMenuCurrentDir),
            },
            {
                type: "button",
                label: "Переместить...",
                onClick: () => setSelectedItem(ctxMenuCurrentDir),
            },
            {
                type: "button",
                label: "Удалить папку",
                onClick: () => setOpenedModal({
                    type: "delete-folder",
                    folder: ctxMenuCurrentDir,
                }),
            },
            {
                type: "separator"
            },
            {
                type: "button",
                label: "Скачать папку",
                onClick: () => downloadFolder(ctxMenuCurrentDir),
            },
            // {
            //     type: "separator"
            // },
            // {
            //     type: "button",
            //     label: "Проверить на дублирование файлов ...",
            //     onClick: () => handleDuplicateCheck(),
            //     // onClick: () => alert('Привет! Это кнопка!')
            // }
        ] : [
            {
                type: "info",
                label: ""
            },
            {
                type: "separator"
            },
            {
                type: "button",
                label: "Скачать файл",
                onClick: () => downloadFile(ctxMenuCurrentDir),
            }
        ]
    ) : [
        {
            type: "button",
            label: "[⇑] Назад"
        },
        {
            type: "button",
            label: "+ Новая папка",
            onClick: () => setOpenedModal('add-folder'),
        },
        {
            type: "separator"
        },
        {
            type: "button",
            label: "Проверить на дублирование файлов ...",
            onClick: () => handleDuplicateCheck(),
            // onClick: () => alert('Привет! Это кнопка!')
        }
    ];

    return (
        <div className="file-navigation__container">
            <div className="file-navigation-controls">
                <div className="file-navigation-controls__left">
                    <button className="file-navigation-controls__button" disabled>⇐</button>
                    <button className="file-navigation-controls__button" disabled>⇒</button>
                    <button className="file-navigation-controls__button back-button" onClick={handleBackButton}>⇑</button>
                </div>
                <div className="file-navigation-controls__right">
                    <div className="file-navigation-path">{displayText}</div>
                </div>
            </div>
            <div className="file-navigation__content" ref={contentRef}>
                {(action.type === 'navigation') ? (
                    data.length > 0 ? (
                        data.map((ent, idx) => (
                            <div
                                className={`file-navigation-entry ${(selectedItem?.parentPath === ent.parentPath && selectedItem?.name === ent.name) ?
                                    "to-move" : ""
                                    }`}
                                onClick={(e) => {
                                    if (!(selectedItem?.parentPath === ent.parentPath && selectedItem?.name === ent.name)) {
                                        handleEntryClick(e, ent);
                                    }
                                }}
                                onContextMenu={(e) => handleEntryRightClick(e, ent)}
                                key={idx}
                            >
                                <div className="file-navigation-entry__left">
                                    <img src={getImageForDirEntry(ent)} alt="Entry Icon" className="file-navigation-entry__icon" />
                                </div>
                                <div className="file-navigation-entry__right">{ent.name}</div>
                            </div>
                        ))
                    ) : (
                        <div className="file-navigation__notification">В папке нет файлов...</div>
                    )
                ) : (action.type === 'duplicateCheck') && (
                    action.duplicates ? (
                        <>
                            {/* <div className="file-navigation__data">
                                <span>Общий размер файлов: </span>
                            </div> */}
                            {Object.entries(action.duplicates).length > 0 ? (Object.entries(action.duplicates).map((g, i) => (
                                <div className="file-navigation-group" key={i}>
                                    <div className="file-navigation-group__header">
                                        <button
                                            className="file-navigation-group__button"
                                            onClick={() => {
                                                setAction({
                                                    ...action,
                                                    collapsedGroups: {
                                                        ...action.collapsedGroups,
                                                        [(g[0])]: (
                                                            action.collapsedGroups?.[g[0]] === true ? false : true
                                                        )
                                                    }
                                                })
                                            }}
                                        >{action.collapsedGroups?.[(g[0])] === true ? '▶' : '▼'}</button>
                                        <span>{g[1].length} одинаковых {getWordEndingByNumber(g[1].length, 'файл')}:</span>
                                    </div>
                                    {(action.collapsedGroups?.[(g[0])] !== true) && <div className="file-navigation__duplicates">
                                        {g[1].map((ent, idx) => (
                                            <div
                                                className="file-navigation-entry"
                                                // onClick={() => handleEntryClick(ent)}
                                                key={idx}
                                            >
                                                <div className="file-navigation-entry__left">
                                                    <img src={getImageForDirEntry(ent)} alt="Entry Icon" className="file-navigation-entry__icon" />
                                                </div>
                                                <div className="file-navigation-entry__right">
                                                    <span className="file-navigation-entry__name">{ent.name}</span>
                                                    <span className="file-navigation-entry__path" title={ent.path}>{ent.path}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>}
                                </div>
                            ))) : (
                                <div className="file-navigation__notification">В папке нет файлов. Дубликаты не обнаружены!</div>
                            )}
                        </>
                    ) : (
                        <div className="file-navigation__notification">{isLoading ? (
                            <>
                                <span>Проверка на дублирование файлов...</span>
                                {progress && (
                                    <div className="file-manager-progress__container">
                                        <div className="file-manager-progress__bar-wrapper">
                                            <div
                                                className="file-manager-progress__bar-fill"
                                                style={{ width: `${progress.percent}%` }}
                                            ></div>
                                        </div>
                                        <div className="file-manager-progress__text">
                                            Проверено файлов: {progress.current} из {progress.total} ({progress.percent}%)
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : 'Дубликаты не обнаружены!'}</div>
                    )
                )}
            </div>
            {(selectedItem) && <div className="file-navigation__bottom">
                <button
                    className="file-navigation__button"
                    onClick={() => {
                        moveFileOrFolder(selectedItem, currentPath);
                    }}
                >Переместить в текущую папку</button>
                <button
                    className="file-navigation__button"
                    onClick={() => setSelectedItem(null)}
                >Отменить перемещение</button>
            </div>}
            <ContextMenu
                activateRef={activateContextMenuRef}
                closeRef={closeContextMenuRef}
                // isOpened={isContextMenuOpen}
                containerRef={contentRef}
                items={contextMenuItems}
                // onClose={() => setContextMenuOpen(false)}
                styles={{
                    top: `${contextMenuPosition?.y || 0}px`,
                    left: `${contextMenuPosition?.x || 0}px`,
                }}
            />
            {(openedModal === 'add-folder') ? (
                <SimpleModal
                    type="prompt"
                    title="Введите название папки:"

                    onConfirm={(v) => {
                        handleAddFolder(v);
                        setOpenedModal(null);
                    }}
                    onCancel={() => setOpenedModal(null)}
                />
            ) : (openedModal?.type === 'delete-folder') && (
                <SimpleModal
                    type="prompt"
                    title={`Удалить папку "${openedModal.folder.name}" безвозвратно? Введите "Удалить папку ${openedModal.folder.name}!" для подтверждения!`}

                    onConfirm={(v) => {
                        if (v === `Удалить папку ${openedModal.folder.name}!`) handleDeleteFolder(openedModal.folder);
                        setOpenedModal(null);
                    }}
                    onCancel={() => setOpenedModal(null)}
                />
            )}
        </div>
    )
}