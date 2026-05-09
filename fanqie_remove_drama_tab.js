/*
 * 番茄小说 App：移除底部「短剧/剧场」入口
 * 适用：Loon / Surge / Quantumult X 的 http-response JSON 脚本
 * 用法：配合插件中的 http-response 规则使用。
 */

(function () {
  const raw = typeof $response !== "undefined" ? $response.body : "";
  if (!raw) return $done({});

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (_) {
    return $done({});
  }

  const BAD_WORD = /(短剧|剧场|小剧场|番茄剧场|看剧|drama|short[\s_-]*play|short[\s_-]*drama|mini[\s_-]*drama|novel[\s_-]*video|fq_video)/i;

  // 只把这些“看起来像入口/Tab/导航”的对象作为删除候选，避免误删普通小说内容。
  const ENTRY_KEY = /(^|_)(tab|tabs|bottom|navigation|navigator|nav|entrance|channel|module|bubble|banner|icon|menu|shortcut|schema|scheme|uri|url|link|deeplink|landing|target|name|title|text|label|type|key|id)($|_)/i;

  function safeStringify(value) {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return "";
    }
  }

  function hasEntryShape(node) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return false;
    return Object.keys(node).some((key) => ENTRY_KEY.test(key));
  }

  function hitBadWord(node) {
    if (!node || typeof node !== "object") return false;

    const fields = [
      "name", "title", "text", "label", "desc",
      "tab_name", "tabName", "tab_title", "tabTitle",
      "channel", "channel_name", "channelName",
      "type", "key", "id", "tab_type", "tabType",
      "schema", "scheme", "uri", "url", "link", "deeplink",
      "landing_url", "landingUrl", "open_url", "openUrl",
      "lynx_url", "lynxUrl", "web_url", "webUrl"
    ];

    for (const key of fields) {
      if (node[key] !== undefined && BAD_WORD.test(String(node[key]))) return true;
    }

    // 兜底：入口对象里字段命名经常变，扫一遍入口对象整体。
    if (hasEntryShape(node) && BAD_WORD.test(safeStringify(node))) return true;

    return false;
  }

  function isBadEntry(node) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return false;
    return hasEntryShape(node) && hitBadWord(node);
  }

  function walk(node) {
    if (Array.isArray(node)) {
      const filtered = node.filter((item) => !isBadEntry(item));
      for (let i = 0; i < filtered.length; i++) filtered[i] = walk(filtered[i]);
      return filtered;
    }

    if (node && typeof node === "object") {
      for (const key of Object.keys(node)) {
        const val = node[key];

        // 有些接口会单独下发一个入口对象，而不是数组。
        if (isBadEntry(val)) {
          delete node[key];
          continue;
        }

        node[key] = walk(val);
      }
    }

    return node;
  }

  const cleaned = walk(obj);
  $done({ body: JSON.stringify(cleaned) });
})();
