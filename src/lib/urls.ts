export const siteName = "纤云叙 · XianYun AI Voice Input";
export const siteDescription = "面向中文办公场景的 AI 语音输入工具。自然口述，忠实整理，可靠写入当前应用。";

export function sitePath(path = "/"): string {
  if (/^(?:https?:|mailto:|#)/.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function absoluteSiteUrl(path = "/"): string {
  return new URL(sitePath(path), "https://gdhucoder.github.io").toString();
}
