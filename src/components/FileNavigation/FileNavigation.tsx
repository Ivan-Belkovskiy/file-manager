'use client';

import { checkDuplicates, enterFolder, FolderEntry, getNavigationData, LoadingError, openPreviousFolder } from "@/app/actions";
import "./FileNavigation.css";
import { useEffect, useRef, useState } from "react";
import { getImageForDirEntry } from "@/utils/images";
import ContextMenu from "../ContextMenu/ContextMenu";
import { getWordEndingByNumber } from "@/utils/string";

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

    const activateContextMenuRef = useRef<((e: MouseEvent) => void) | null>(null);
    const closeContextMenuRef = useRef<(() => void) | null>(null);

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

    const handleEntryClick = async (ent: FolderEntry) => {
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

    const handleDuplicateCheck = async () => {
        if (isLoading) return;

        setLoading(true);
        setAction({
            type: 'duplicateCheck',
        });
        const res = await checkDuplicates(currentPath);

        if (res.success && res.duplicates) {
            setAction({
                type: 'duplicateCheck',
                duplicates: res.duplicates,
            });
            // console.log('DUPLICATES:');
            // console.log(res.duplicates);
        } else {
            // setLoadingError({
            //     type: res.error?.type,
            //     message: res.error?.message || "",
            // });
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, [initialPath]);

    useEffect(() => {
        const contextMenuHandler = (e: MouseEvent) => {
            if (!contentRef.current) return;
            console.log('Context menu event:');
            console.log(e);

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
    ) : currentPath

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
                                className="file-navigation-entry"
                                onClick={() => handleEntryClick(ent)}
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
                        Object.entries(action.duplicates).length > 0 ? (Object.entries(action.duplicates).map((g, i) => (
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
                                                <span className="file-navigation-entry__path">{ent.path}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>}
                            </div>
                        ))) : (
                            <div className="file-navigation__notification">В папке нет файлов. Дубликаты не обнаружены!</div>
                        )
                    ) : (
                        <div className="file-navigation__notification">{isLoading ? 'Проверка на дублирование файлов...' : 'Дубликаты не обнаружены!'}</div>
                    )
                )}
            </div>
            <ContextMenu
                activateRef={activateContextMenuRef}
                closeRef={closeContextMenuRef}
                // isOpened={isContextMenuOpen}
                containerRef={contentRef}
                items={[
                    {
                        type: "button",
                        label: "[⇑] Назад"
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
                ]}
                // onClose={() => setContextMenuOpen(false)}
                styles={{
                    top: `${contextMenuPosition?.y || 0}px`,
                    left: `${contextMenuPosition?.x || 0}px`,
                }}
            />
        </div>
    )
}