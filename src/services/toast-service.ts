export interface ToastOptions {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
    action?: { label: string; callback: () => void };
    duration?: number;
}

interface ToastEntry extends ToastOptions {
    id: number;
    timer: ReturnType<typeof setTimeout>;
}

type ToastListener = (toasts: ToastEntry[]) => void;

class ToastService {
    private toasts: ToastEntry[] = [];
    private listeners: ToastListener[] = [];
    private nextId = 1;

    subscribe(fn: ToastListener): () => void {
        this.listeners.push(fn);
        return () => { this.listeners = this.listeners.filter(l => l !== fn); };
    }

    show(options: ToastOptions): void {
        const duration = options.duration ?? (options.type === 'error' ? 8000 : 5000);
        const id = this.nextId++;
        const timer = setTimeout(() => this.dismiss(id), duration);
        const entry: ToastEntry = { ...options, id, timer };
        this.toasts = [...this.toasts, entry];
        while (this.toasts.length > 3) {
            const oldest = this.toasts[0];
            clearTimeout(oldest.timer);
            this.toasts = this.toasts.slice(1);
        }
        this.notify();
    }

    dismiss(id: number): void {
        const toast = this.toasts.find(t => t.id === id);
        if (toast) clearTimeout(toast.timer);
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.notify();
    }

    success(title: string, description?: string): void {
        this.show({ type: 'success', title, description });
    }

    error(title: string, description?: string): void {
        this.show({ type: 'error', title, description });
    }

    warning(title: string, description?: string): void {
        this.show({ type: 'warning', title, description });
    }

    info(title: string, description?: string): void {
        this.show({ type: 'info', title, description });
    }

    private notify(): void {
        this.listeners.forEach(fn => fn([...this.toasts]));
    }
}

export const toastService = new ToastService();
