export const siteName = "纤云叙 · XianYun AI Voice Input";
export const siteDescription = "写邮件、回消息、记想法时，按下快捷键直接说。纤云叙把话变成文字，再放回光标所在的地方。";

export function sitePath(path = "/"): string {
  if (/^(?:https?:|mailto:|#)/.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function absoluteSiteUrl(path = "/"): string {
  return new URL(sitePath(path), "https://gdhucoder.github.io").toString();
}
