<script lang="ts">
	import { toasts, removeToast } from '$lib/toastStore';
</script>

{#if $toasts.length > 0}
	<div class="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
		{#each $toasts as toast (toast.id)}
			<div
				class={{
					'pointer-events-auto flex max-w-sm items-start gap-2 rounded-md px-3 py-2 text-sm text-white shadow-lg': true,
					'border-l-4 border-slate-400 bg-slate-800': !toast.type,
					'border-l-4 border-green-400 bg-green-600': toast.type === 'success',
					'border-l-4 border-red-400 bg-red-600': toast.type === 'error',
					'border-l-4 border-yellow-400 bg-yellow-600': toast.type === 'warning',
					'border-l-4 border-blue-400 bg-blue-600': toast.type === 'info'
				}}
				role="status"
			>
				<span class="flex-1">{toast.message}</span>
				<button
					class="ml-2 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white"
					type="button"
					onclick={() => removeToast(toast.id)}
				>
					✕
				</button>
			</div>
		{/each}
	</div>
{/if}
