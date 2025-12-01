import { Injectable, signal } from '@angular/core';

export interface ModalData {
    title: string;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    isOpen = signal(false);
    data = signal<ModalData>({ title: '', message: '' });
    isConfirmation = signal(false);
    private onConfirmCallback: (() => void) | null = null;

    open(title: string, message: string) {
        this.data.set({ title, message });
        this.isConfirmation.set(false);
        this.onConfirmCallback = null;
        this.isOpen.set(true);
    }

    confirm(title: string, message: string, onConfirm: () => void) {
        this.data.set({ title, message });
        this.isConfirmation.set(true);
        this.onConfirmCallback = onConfirm;
        this.isOpen.set(true);
    }

    close() {
        this.isOpen.set(false);
        this.onConfirmCallback = null;
    }

    triggerConfirm() {
        if (this.onConfirmCallback) {
            this.onConfirmCallback();
        }
        this.close();
    }
}
