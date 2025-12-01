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

    open(title: string, message: string) {
        this.data.set({ title, message });
        this.isOpen.set(true);
    }

    close() {
        this.isOpen.set(false);
    }
}
