export default {
  async fetch(request, env) {
    const method = request.method.toUpperCase()
    if (method !== "GET" && method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 })
    }

    const url = new URL(request.url)
    const pathname = url.pathname

    const candidates = []
    if (pathname === "/") {
      candidates.push("/index.html")
    }
    candidates.push(pathname)
    if (pathname.endsWith("/")) {
      candidates.push(`${pathname}index.html`)
    } else if (!pathname.includes(".")) {
      candidates.push(`${pathname}/index.html`)
    }

    let lastResponse = null
    for (const candidate of candidates) {
      url.pathname = candidate
      const assetRequest = new Request(url.toString(), request)
      const response = await env.ASSETS.fetch(assetRequest)
      lastResponse = response
      if (response.status !== 404) return response
    }

    return lastResponse ?? new Response("Not Found", { status: 404 })
  },
}
