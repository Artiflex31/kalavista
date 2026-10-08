import jwt from 'jsonwebtoken'

function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization

  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
    })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    if (payload.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access is required.',
      })
    }

    req.admin = payload
    next()
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Your login session is invalid or has expired.',
    })
  }
}

export default requireAdmin
