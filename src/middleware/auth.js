import jwt from 'jsonwebtoken';

const cookieName = process.env.COOKIE_NAME || 'pc_sid';

export function requireAuth(req, res, next) {
	try {
		const token = req.cookies[cookieName];
		if (!token) return res.status(401).json({ message: 'Unauthorized' });
		const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
		req.user = { id: payload.sub };
		next();
	} catch (err) {
		return res.status(401).json({ message: 'Unauthorized' });
	}
}

export function setAuthCookie(res, userId) {
	const token = jwt.sign({}, process.env.JWT_SECRET || 'dev-secret', {
		subject: userId.toString(),
		expiresIn: '7d',
	});
	res.cookie(cookieName, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 7 * 24 * 60 * 60 * 1000,
		path: '/',
	});
}

export function clearAuthCookie(res) {
	res.clearCookie(cookieName, { path: '/' });
}
