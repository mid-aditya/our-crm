export function cn(...parts: Array<string | false | null | undefined | object>): string {
	return parts
		.filter((p): p is string => typeof p === 'string' && p !== '')
		.join(' ');
}

export function initials(name: string): string {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => (w[0] ?? '').toUpperCase())
		.join('');
}
