export const siteName = "纤云叙 · XianYun AI Voice Input";
export const siteDescription = "为中文办公而做的 AI 语音输入工具。像平时一样说，它会整理好，再写进你正在使用的应用。";

export function sitePath(path = "/"): string {
  if (/^(?:https?:|mailto:|#)/.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function absoluteSiteUrl(path = "/"): string {
  return new URL(sitePath(path), "https://gdhucoder.github.io").toString();
}
