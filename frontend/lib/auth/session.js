export function hasSessionCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const name = part.trim().split("=")[0];
    return name === "sid" || name === "rid";
  });
}
