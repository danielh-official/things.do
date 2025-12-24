// place files you want to import through the `$lib` alias in this folder.

export function clickOutside(node: {
	contains: (arg0: any) => any;
	dispatchEvent: (arg0: CustomEvent<unknown>) => void;
}) {
	// the node has been mounted in the DOM

	window.addEventListener('click', handleClick);

	function handleClick(e: { target: any }) {
		if (!node.contains(e.target)) {
			node.dispatchEvent(new CustomEvent('outsideclick'));
		}
	}

	return {
		destroy() {
			// the node has been removed from the DOM
			window.removeEventListener('click', handleClick);
		}
	};
}
