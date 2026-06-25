const inputMethodLabels: Record<string, string> = {
  manual: "手動輸入",
  camera: "拍照輸入",
  gallery: "上傳照片",
  unknown: "未知方式",
};

export function getInputMethodLabel(method: string | null | undefined) {
  if (!method) return "未知方式";
  return inputMethodLabels[method] || method;
}
