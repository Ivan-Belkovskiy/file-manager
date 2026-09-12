'use client';

import { useEffect, useState } from "react";
import "./SimpleModal.css";

export type SimpleModalType = "info" | "confirm" | "prompt";

export type SimpleModalProps = {
    type: "info";
    title?: string;
    message?: string;

    disableButtons?: boolean;

    confirmBtnText?: string;

    onConfirm?: () => void;
    // onCancel?: () => void;
} | {
    type: "confirm";
    title?: string;
    message?: string;

    disableButtons?: boolean;

    confirmBtnText?: string;
    cancelBtnText?: string;

    onConfirm?: () => void;
    onCancel?: () => void;
} | {
    type: "prompt";
    title?: string;

    disableButtons?: boolean;

    confirmBtnText?: string;
    cancelBtnText?: string;

    inputPlaceholder?: string;

    onConfirm?: (value: string) => void;
    onCancel?: () => void;
};

export default function SimpleModal(props: SimpleModalProps) {

    const [inputValue, setInputValue] = useState('');

    return (
        <div className="simple-modal__overlay">
            <div className="simple-modal">
                <div className="simple-modal__main">
                    <h1 className="simple-modal__title">{props.title || "Модальное окно"}</h1>
                </div>
                {(props.type === "info") ? (
                    <>
                        <div className="simple-modal__content">
                            <p className="simple-modal__message">{props.message}</p>
                        </div>
                        <div className="simple-modal__buttons">
                            <button className="simple-modal__button" onClick={() => props.onConfirm?.()}>{props.confirmBtnText || "ОК"}</button>
                        </div>
                    </>
                ) : (props.type === "confirm") ? (
                    <>
                        <div className="simple-modal__content">
                            <p className="simple-modal__message">{props.message}</p>
                        </div>
                        <div className="simple-modal__buttons">
                            <button className="simple-modal__button" onClick={() => props.onConfirm?.()}>{props.confirmBtnText || "ОК"}</button>
                            <button className="simple-modal__button" onClick={() => props.onCancel?.()}>{props.cancelBtnText || "Отмена"}</button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="simple-modal__content">
                            <input
                                type="text"
                                className="simple-modal__input"
                                placeholder={props.inputPlaceholder}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="simple-modal__buttons">
                            <button disabled={props.disableButtons} className="simple-modal__button" onClick={() => props.onConfirm?.(inputValue)}>{props.confirmBtnText || "ОК"}</button>
                            <button disabled={props.disableButtons} className="simple-modal__button" onClick={() => props.onCancel?.()}>{props.cancelBtnText || "Отмена"}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}