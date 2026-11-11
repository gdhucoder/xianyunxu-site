export const siteName = "纤云叙 · XianYun AI Voice Input";
export const siteDescription = "纤云叙：面向日常输入的本地语音识别，AI 文字整理按需开启。查看新版界面预览、当前公开 Beta 下载与数据去向说明。";

export function sitePath(path = "/"): string {
  if (/^(?:https?:|mailto:|#)/.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function absoluteSiteUrl(path = "/"): string {
  return new URL(sitePath(path), "https://gdhucoder.github.io").toString();
}
