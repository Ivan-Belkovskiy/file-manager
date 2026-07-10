'use client';

import { CSSProperties, RefObject, useEffect, useRef, useState } from "react";
import "./ContextMenu.css";

export type ContextMenuItem = {
    type: "separator",
} | {
    iconUrl?: string;
    label: string;
    type: "button" | "info";
    onClick?: () => void;
}

export interface ContextMenuProps {
    activateRef?: RefObject<((e: MouseEvent) => void) | null>;
    closeRef?: RefObject<(() => void) | null>;
    items: ContextMenuItem[];
    styles?: CSSProperties;
    containerRef?: RefObject<HTMLDivElement | null>
}

export default function ContextMenu({ activateRef, closeRef, items, styles, containerRef }: ContextMenuProps) {

    const menuRef = useRef<HTMLDivElement | null>(null);
    const [isOpened, setOpened] = useState(false);

    const [positions, setPositions] = useState({
        top: 0,
        left: 0,
    });

    const handleItemClick = (item: ContextMenuItem) => {
        if (item.type === 'button' && item.onClick) {
            item.onClick();
            setOpened(false);
        }
    }

    const positionMenu = (e: MouseEvent) => {
        if (!menuRef.current || !containerRef?.current) return;

        const menuRect = menuRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        setPositions({
            top: e.clientY - (containerRect.top / 2) - (menuRect.height / 2),
            left: e.clientX - (containerRect.left),
        });

        // alert(menuRect.top - containerRect.top + containerRef.current.scrollTop)
    }

    useEffect(() => {
        if (activateRef) activateRef.current = (e: MouseEvent) => {
            setOpened(true);
            positionMenu(e);
        }
    }, [activateRef]);

    useEffect(() => {
        if (closeRef) closeRef.current = () => {
            setOpened(false);
        }
    }, [closeRef]);

    // useEffect(() => {
    //     positionMenu();
    // }, [isOpened]);

    return (
        <div className={`context-menu ${isOpened ? 'opened' : ''}`} style={{
            ...styles,
            top: `${positions.top}px`,
            left: `${positions.left}px`,
        }} ref={menuRef}>
            {items.map((item, idx) => (
                <div className={`context-menu-item type-${item.type}`} key={idx} onClick={() => handleItemClick(item)}>
                    {(item.type !== 'separator') && (
                        <>
                            <div className="context-menu-item__left">
                                {(item.iconUrl) && <img src={item.iconUrl} className="context-menu-item__icon" />}
                            </div>
                            <div className="context-menu-item__right">
                                {item.label}
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    )
}