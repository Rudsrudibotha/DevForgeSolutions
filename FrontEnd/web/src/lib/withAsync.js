export async function withAsync(promise, fallbackMessage = "Something went wrong") {
  try { return [await promise, null]; }
  catch (e) { console.error("api_error", { name: e?.name, message: e?.message }); return [null, fallbackMessage]; }
}