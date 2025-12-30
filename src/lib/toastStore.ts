import { writable } from 'svelte/store';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
	id: number;
	message: string;
	type: ToastType;
	duration: number;
}

const DEFAULT_DURATION = 4000;

const toastsStore = writable<Toast[]>([]);

let idCounter = 0;

export const toasts = {
	subscribe: toastsStore.subscribe
};

export function addToast(
	message: string,
	options?: {
		type?: ToastType;
		duration?: number;
	}
): number {
	const id = ++idCounter;
	const toast: Toast = {
		id,
		message,
		type: options?.type ?? 'info',
		duration: options?.duration ?? DEFAULT_DURATION
	};

	toastsStore.update((current) => [...current, toast]);

	setTimeout(() => {
		removeToast(id);
	}, toast.duration);

	return id;
}

export function removeToast(id: number) {
	toastsStore.update((current) => current.filter((toast) => toast.id !== id));
}
