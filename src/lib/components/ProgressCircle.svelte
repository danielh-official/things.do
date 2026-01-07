<script lang="ts">
	let {
		completed = 0,
		total = 0,
		size = 20
	}: { completed?: number; total?: number; size?: number } = $props();

	let percentage = $derived(total > 0 ? (completed / total) * 100 : 0);
	let radius = $derived(size / 2 - 2);
	let circumference = $derived(2 * Math.PI * radius);
	let strokeDashoffset = $derived(circumference - (percentage / 100) * circumference);
</script>

<svg width={size} height={size} class="inline-block">
	<!-- Background circle -->
	<circle
		cx={size / 2}
		cy={size / 2}
		r={radius}
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		class="text-gray-300 dark:text-gray-600"
	/>
	<!-- Progress circle -->
	<circle
		cx={size / 2}
		cy={size / 2}
		r={radius}
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-dasharray={circumference}
		stroke-dashoffset={strokeDashoffset}
		stroke-linecap="round"
		transform="rotate(-90 {size / 2} {size / 2})"
		class="text-blue-500 transition-all duration-300"
	/>
</svg>
