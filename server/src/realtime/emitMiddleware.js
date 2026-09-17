import { emitResource } from './index.js'

const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function withEmit(router, resource) {
  const emitMw = (req, res, next) => {
    if (!WRITE.has(req.method)) return next()
    const oJson = res.json.bind(res)
    let body
    res.json = (payload) => {
      body = payload
      return oJson(payload)
    }
    res.on('finish', () => {
      if (body && res.statusCode < 400) emitResource(resource, req.method.toLowerCase(), body)
    })
    next()
  }

  router.use(emitMw)
  const added = router.stack.pop()
  router.stack.unshift(added)
  return router
}
