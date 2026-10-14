const loginAttempts = new Map()

// Clean up expired entries every 10 minutes to prevent memory accumulation.
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of loginAttempts.entries()) {
    if (now > data.resetTime) {
      loginAttempts.delete(key)
    }
  }
}, 10 * 60 * 1000)

export function loginRateLimiter(req, res, next) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.ip ||
    'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  let record = loginAttempts.get(ip)

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    }
    loginAttempts.set(ip, record)
    return next()
  }

  record.count += 1

  if (record.count > maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000)
    res.setHeader('Retry-After', retryAfterSeconds)
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
    })
  }

  next()
}
