export const computeHash: (data: ArrayBuffer) => Promise<string> = async (data) => {
	return Array.prototype.map.call(
		new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
		(x: number) => x.toString(16).padStart(2, "0")
	).reduce((prev, curr) => prev + curr, "");
}