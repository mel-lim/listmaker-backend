// COOKIE CONFIG
const MAX_AGE = 60 * 60 * 1000 * 12; // 12 hours
const jwtCookieOptionsDev = {
    maxAge: MAX_AGE, // 12 hours
    httpOnly: true,
    sameSite: true,
    overwrite: true
};
const jwtCookieOptionsProduction = {
    domain: '.kitcollab.netlify.app',
    path: '/',
    maxAge: MAX_AGE, // 12 hours
    httpOnly: true,
    secure: true,
    sameSite: true,
    overwrite: true
};
const usernameCookieOptionsDev = {
    maxAge: MAX_AGE,
    sameSite: true,
    overwrite: true
};
const usernameCookieOptionsProduction = {
    domain: '.kitcollab.netlify.app',
    path: '/',
    maxAge: MAX_AGE,
    sameSite: true,
    overwrite: true
};

module.exports = {
    jwtCookieOptionsDev,
    jwtCookieOptionsProduction,
    usernameCookieOptionsDev,
    usernameCookieOptionsProduction
};