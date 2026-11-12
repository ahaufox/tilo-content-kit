/**
 * table-layout — 表格列宽智能控制与动态排版算法
 *
 * 职责：
 *   1. 智能识别表头特征（序号列紧凑化固定，保证“序号”二字及 padding 不被强制换行；短元数据列适度紧凑；长文本列弹性分配）。
 *   2. 第一行（表头）加权与防折行保底：当第一行内容长度大于数据行时，重点参考表头（赋予高密度权重），而非被数据行简单平均稀释；
 *      并根据表头字符数动态推导每列的最小安全宽度。
 *   3. 按比例分配并在总宽边界内归一化，输出精确的像素宽度数组，供 Tiptap 和富文本展示使用。
 *
 * 变更说明：
 *   - [2026-08-16] 初始实现：对齐后端 Word 导出表格布局算法，支持智能表头识别、第一行加权与序号紧凑化
 */

// ── 表头语义识别正则 ────────────────────────────────────────────────────────
export const TABLE_INDEX_HEADER_RE = /^(\s*#\s*|序号|序|编号|NO\.?|No\.?|ID|id|项号|顺序|标记|勾选|选择|行号)$/i;

export const TABLE_COMPACT_HEADER_RE = /^(日期|时间|年份|月份|类型|种类|类别|形式|页码|页数|原件|复印件|原\/复件|原件\/复印件|金额|币种|状态|级别|签章|盖章|份数|数量|单位|电话|联系电话|邮编|角色|身份)$/;

export const TABLE_LONG_HEADER_RE = /^(证明目的|证据名称|事实描述|主要内容|争议焦点|法律分析|案情摘要|诉讼请求|裁判要点|分析意见|答辩意见|事实与理由|条款内容|备注|说明|补充意见|证据内容|核心事实).*$/;

/**
 * 动态计算 A4 或指定物理页面在指定 DPI 下的实际可用版心像素宽度
 *
 * @param pageWidthMm 纸张物理宽度（默认 A4 210mm）
 * @param marginLeftMm 左页边距（默认 31.8mm）
 * @param marginRightMm 右页边距（默认 31.8mm）
 * @param dpi 屏幕/渲染分辨率（默认标准 96 DPI）
 */
export function getPrintablePageWidthPx(
  pageWidthMm: number = 210,
  marginLeftMm: number = 31.8,
  marginRightMm: number = 31.8,
  dpi: number = 96
): number {
  const contentWidthMm = Math.max(pageWidthMm - marginLeftMm - marginRightMm, 50);
  return Math.round((contentWidthMm / 25.4) * dpi);
}

// ── 排版常量 ────────────────────────────────────────────────────────────────
// 动态计算默认版心宽度（基准：A4 纸张 210mm 减去双侧 31.8mm 页边距，96 DPI 下约为 553px）
export const DEFAULT_TABLE_WIDTH_PX = getPrintablePageWidthPx();
// 以下常量与后端 SSOT `tilo_export.docx_table_layout` 逐项对齐（英寸 × 96dpi），
// 修改前请先跑 tests/table-layout-parity.spec.ts —— 屏幕列宽与 Word 导出列宽必须同源。
export const INDEX_COL_WIDTH_PX = 48; // 0.50in
export const INDEX_COL_MIN_WIDTH_PX = 40; // 0.42in
export const INDEX_COL_MAX_WIDTH_PX = 58;
export const BASE_MIN_COL_WIDTH_PX = 48; // 0.50in（TABLE_LAYOUT_MIN_COL_INCHES）
export const BASE_PADDING_PX = 14.4; // 0.15in（TABLE_LAYOUT_PADDING_INCHES）
export const CHAR_WIDTH_UNIT_PX = 3.072; // 0.032in/单宽字符；CJK 权重 2.0 → 6.144px
export const FIRST_COL_WIDTH_PX = 105.6; // 1.10in（TABLE_LAYOUT_FIRST_COL_INCHES）
export const HEADER_WEIGHT_BOOST = 1.15;
export const MAX_COL_RATIO = 0.55;
export const EXTREME_OUTLIER_RATIO = 20.0;
export const MAX_SAMPLE_ROWS = 200;



// 行内 Markdown 标记剥离正则
const CELL_STRIP_RE = /\*\*|__|`|~~|\[\[|\]\]|<br\s*\/?>/gi;

/**
 * 估算单元格的可见字符宽度权重（CJK 字符 = 2.0，ASCII/数字 = 1.0）
 */
export function measureCellLength(text: string | null | undefined): number {
  if (!text) return 0.0;
  const plain = String(text).replace(CELL_STRIP_RE, '');
  let width = 0.0;
  for (let i = 0; i < plain.length; i++) {
    const ch = plain[i];
    if (ch === '\n' || ch === '\r') continue;
    if (ch.charCodeAt(0) > 0x2e7f) {
      width += 2.0;
    } else {
      width += 1.0;
    }
  }
  return width;
}

export type ColumnCategory = 'index' | 'compact' | 'long' | 'standard';

export interface ColumnAnalysis {
  densities: number[];
  numCols: number;
  minWidths: Record<number, number>;
  colTypes: Record<number, ColumnCategory>;
}

/**
 * 深度分析表格每列的表头特征、数据密度及防折行最小安全宽度
 */
export function analyzeTableColumnDetails(
  rows: string[][],
  totalWidthPx: number = DEFAULT_TABLE_WIDTH_PX
): ColumnAnalysis {
  if (!rows || rows.length === 0) {
    return { densities: [], numCols: 0, minWidths: {}, colTypes: {} };
  }

  const numCols = Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0)), 0);
  if (numCols === 0) {
    return { densities: [], numCols: 0, minWidths: {}, colTypes: {} };
  }

  const sampleRows = rows.slice(0, MAX_SAMPLE_ROWS);
  const headerRow = sampleRows[0] || [];

  const densities: number[] = [];
  const minWidths: Record<number, number> = {};
  const colTypes: Record<number, ColumnCategory> = {};

  // 1. 表头语义分类 + 防折行最小安全宽度（与后端一致：先分类，再按表头长度推导 min）
  for (let cIdx = 0; cIdx < numCols; cIdx++) {
    const headerText = String(headerRow[cIdx] ?? '').trim();
    const headerLen = measureCellLength(headerText);

    let colType: ColumnCategory = 'standard';
    if (TABLE_INDEX_HEADER_RE.test(headerText)) {
      colType = 'index';
    } else if (TABLE_COMPACT_HEADER_RE.test(headerText)) {
      colType = 'compact';
    } else if (TABLE_LONG_HEADER_RE.test(headerText)) {
      colType = 'long';
    }
    colTypes[cIdx] = colType;

    minWidths[cIdx] =
      colType === 'index'
        ? INDEX_COL_MIN_WIDTH_PX
        : Math.max(BASE_MIN_COL_WIDTH_PX, headerLen * CHAR_WIDTH_UNIT_PX + BASE_PADDING_PX);
  }

  // 2. 列密度：表头参与采样；超长值只截断不剔除（后端语义：min(v, threshold)）
  const colLengths: number[][] = Array.from({ length: numCols }, () => []);
  for (const row of sampleRows) {
    for (let c = 0; c < numCols; c += 1) {
      const cell = Array.isArray(row) && c < row.length ? row[c] : '';
      colLengths[c].push(measureCellLength(cell));
    }
  }

  for (let c = 0; c < numCols; c += 1) {
    const lengths = colLengths[c];
    if (lengths.length === 0) {
      densities.push(1.0);
      continue;
    }

    const headerVal = lengths[0];
    const dataVals = lengths.slice(1);

    let dataAvg = 0.0;
    if (dataVals.length > 0) {
      const sorted = [...dataVals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const threshold = Math.max(median * EXTREME_OUTLIER_RATIO, 20.0);
      const capped = dataVals.map((v) => Math.min(v, threshold));
      dataAvg = capped.reduce((sum, v) => sum + v, 0) / capped.length;
    }

    let effective: number;
    if (headerVal > dataAvg && dataAvg > 0) {
      // 表头比数据长：加权值与数据均值取中，避免表头被数据行平均稀释
      effective = (headerVal * HEADER_WEIGHT_BOOST + dataAvg) / 2.0;
    } else if (dataAvg > 0) {
      effective = dataAvg;
    } else {
      effective = headerVal > 0 ? headerVal : 1.0;
    }

    densities.push(Math.max(effective, 1.0));
  }

  return { densities, numCols, minWidths, colTypes };
}

/**
 * 智能计算表格各列的像素宽度（px）
 *
 * @param rows - 单元格二维数组（第一行为表头）
 * @param totalWidthPx - 表格总宽度（默认 A4 版心 553px）
 * @param explicitFixedWidths - 用户或外部显式指定的固定列宽映射 { colIndex: widthPx }
 * @returns 每列像素宽度数组，如 [60, 240, 460]
 */
export function calculateTableColumnWidths(
  rows: string[][],
  totalWidthPx: number = DEFAULT_TABLE_WIDTH_PX,
  explicitFixedWidths?: Record<number, number>
): number[] {
  if (!rows || rows.length === 0) return [];

  const { densities, numCols, minWidths, colTypes } = analyzeTableColumnDetails(rows, totalWidthPx);
  if (numCols === 0) return [];

  // 清洗显式固定列宽
  const cleanFixed: Record<number, number> = {};
  if (explicitFixedWidths) {
    for (const [k, v] of Object.entries(explicitFixedWidths)) {
      const idx = Number(k);
      if (Number.isInteger(idx) && idx >= 0 && idx < numCols && typeof v === 'number' && v > 0) {
        cleanFixed[idx] = Math.round(v);
      }
    }
  }

  // 序号列智能固定：如果某列为序号列且未显式指定宽度，且总列数 >= 2 时自动固定为 INDEX_COL_WIDTH_PX (60px)
  if (numCols >= 2) {
    for (let i = 0; i < numCols; i++) {
      if (colTypes[i] === 'index' && cleanFixed[i] == null) {
        cleanFixed[i] = INDEX_COL_WIDTH_PX;
      }
    }
  }

  const fixedTotal = Object.values(cleanFixed).reduce((sum, w) => sum + w, 0);

  // 若固定列已超出总宽：等比压缩固定列
  if (fixedTotal >= totalWidthPx) {
    const freeCount = numCols - Object.keys(cleanFixed).length;
    const reserve = freeCount * BASE_MIN_COL_WIDTH_PX;
    const availableForFixed = totalWidthPx - reserve;

    if (availableForFixed > 0 && fixedTotal > 0) {
      const scale = Math.min(1.0, availableForFixed / fixedTotal);
      const res: number[] = new Array(numCols).fill(0);
      for (let i = 0; i < numCols; i++) {
        res[i] = cleanFixed[i] != null ? Math.round(cleanFixed[i] * scale) : BASE_MIN_COL_WIDTH_PX;
      }
      return res;
    }

    const scale = fixedTotal > 0 ? totalWidthPx / fixedTotal : 1.0;
    const res: number[] = new Array(numCols).fill(0);
    for (let i = 0; i < numCols; i++) {
      res[i] = cleanFixed[i] != null ? Math.round(cleanFixed[i] * scale) : BASE_MIN_COL_WIDTH_PX;
    }
    return res;
  }

  const freeIdx: number[] = [];
  for (let i = 0; i < numCols; i++) {
    if (cleanFixed[i] == null) freeIdx.push(i);
  }

  const freeBudget = totalWidthPx - fixedTotal;
  const freeDensities = freeIdx.map((i) => densities[i] || 1.0);
  const totalFreeDensity = freeDensities.reduce((sum, d) => sum + d, 0);

  const ratios =
    totalFreeDensity <= 0
      ? freeIdx.map(() => 1.0 / (freeIdx.length || 1))
      : freeDensities.map((d) => d / totalFreeDensity);

  const widths: number[] = new Array(numCols).fill(0);
  for (let i = 0; i < numCols; i++) {
    if (cleanFixed[i] != null) {
      widths[i] = cleanFixed[i];
    }
  }

  for (let k = 0; k < freeIdx.length; k++) {
    const idx = freeIdx[k];
    widths[idx] = ratios[k] * freeBudget;
  }

  // 最小安全宽度约束
  const totalMinRequired = freeIdx.reduce((sum, idx) => sum + (minWidths[idx] || BASE_MIN_COL_WIDTH_PX), 0);
  if (totalMinRequired > freeBudget && freeIdx.length > 0) {
    const perCol = freeBudget / freeIdx.length;
    for (const idx of freeIdx) {
      widths[idx] = perCol;
    }
  } else {
    // 补齐不足最小安全宽度的列，从富余列回收
    for (const i of freeIdx) {
      const targetMin = minWidths[i] || BASE_MIN_COL_WIDTH_PX;
      if (widths[i] < targetMin) {
        const deficit = targetMin - widths[i];
        widths[i] = targetMin;
        const surplusIdx = freeIdx.filter((j) => j !== i && widths[j] > (minWidths[j] || BASE_MIN_COL_WIDTH_PX));
        if (surplusIdx.length === 0) break;
        const surplusTotal = surplusIdx.reduce(
          (sum, j) => sum + (widths[j] - (minWidths[j] || BASE_MIN_COL_WIDTH_PX)),
          0
        );
        const take = Math.min(deficit, surplusTotal);
        for (const j of surplusIdx) {
          const avail = widths[j] - (minWidths[j] || BASE_MIN_COL_WIDTH_PX);
          widths[j] -= surplusTotal > 0 ? take * (avail / surplusTotal) : 0;
        }
      }
    }

    // 单列占比上限约束（> 2 列生效）
    if (numCols > 2) {
      const cap = totalWidthPx * MAX_COL_RATIO;
      for (const i of freeIdx) {
        if (widths[i] > cap) {
          const excess = widths[i] - cap;
          widths[i] = cap;
          const surplusIdx = freeIdx.filter((j) => j !== i && widths[j] < cap);
          if (surplusIdx.length === 0) break;
          const surplusTotal = surplusIdx.reduce((sum, j) => sum + (cap - widths[j]), 0);
          for (const j of surplusIdx) {
            widths[j] += surplusTotal > 0 ? excess * ((cap - widths[j]) / surplusTotal) : 0;
          }
        }
      }
    }

    // 首列短标签收敛（2~3 列且首列密度不大于后续列）
    if (numCols >= 2 && numCols <= 3 && freeIdx.includes(0)) {
      const firstColType = colTypes[0] || 'standard';
      const restAvgDensity =
        freeIdx.filter((j) => j !== 0).reduce((sum, j) => sum + (densities[j] || 1.0), 0) /
        Math.max(freeIdx.length - 1, 1);
      const isShortLabel = (densities[0] || 0) <= restAvgDensity || firstColType === 'index' || firstColType === 'compact';
      const firstColTargetPx = Math.round(FIRST_COL_WIDTH_PX); // 1.10in，与后端 FIRST_COL_INCHES 一致

      if (isShortLabel && firstColType !== 'long' && widths[0] > firstColTargetPx) {
        const excess = widths[0] - firstColTargetPx;
        widths[0] = firstColTargetPx;
        const restFree = freeIdx.filter((j) => j !== 0);
        const restTotal = restFree.reduce((sum, j) => sum + widths[j], 0);
        if (restTotal > 0) {
          for (const j of restFree) {
            widths[j] += excess * (widths[j] / restTotal);
          }
        }
      }
    }
  }

  // 四舍五入取整并做总和微调
  const rounded = widths.map((w) => Math.max(Math.round(w), INDEX_COL_MIN_WIDTH_PX));
  const currentTotal = rounded.reduce((sum, w) => sum + w, 0);
  const diff = totalWidthPx - currentTotal;

  if (diff !== 0 && freeIdx.length > 0) {
    // 找到最宽的自由列调整误差
    let widestIdx = freeIdx[0];
    for (const idx of freeIdx) {
      if (rounded[idx] > rounded[widestIdx]) {
        widestIdx = idx;
      }
    }
    rounded[widestIdx] = Math.max(rounded[widestIdx] + diff, BASE_MIN_COL_WIDTH_PX);
  }

  return rounded;
}

/**
 * 遍历 HTML 字符串中的 <table> 标签，为未显式设置 colwidth 的表格注入智能计算的列宽与 <colgroup>
 *
 * @param html - 待处理的 HTML 字符串
 * @param totalWidthPx - 表格总宽度（默认 A4 版心 553px）
 * @returns 注入列宽属性后的 HTML 字符串
 */
export function injectTableWidthsToHtml(
  html: string,
  totalWidthPx: number = DEFAULT_TABLE_WIDTH_PX
): string {
  if (!html || !html.includes('<table')) return html;

  return html.replace(
    /<table\b([^>]*)>([\s\S]*?)<\/table>/gi,
    (match: string, tableAttrs: string, tableInner: string) => {
      // 若已显式存在 colwidth 属性，保留原样
      if (/colwidth=/i.test(tableAttrs)) {
        return match;
      }

      // 提取所有 <tr> 行中的 <th> 或 <td> 文本
      const rows: string[][] = [];
      const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch: RegExpExecArray | null;

      while ((trMatch = trRegex.exec(tableInner)) !== null) {
        const rowContent = trMatch[1];
        const cells: string[] = [];
        const cellRegex = /<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
        let cellMatch: RegExpExecArray | null;
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          // 剥离内部 HTML 标签以获取纯文本用于计算宽度
          const cellText = cellMatch[1].replace(/<[^>]+>/g, '').trim();
          cells.push(cellText);
        }
        if (cells.length > 0) {
          rows.push(cells);
        }
      }

      if (rows.length === 0) return match;

      const colwidths = calculateTableColumnWidths(rows, totalWidthPx);
      if (!colwidths || colwidths.length === 0) return match;

      // 构造 colgroup
      const colgroupHtml = `<colgroup>${colwidths.map((w) => `<col style="width: ${w}px;" width="${w}" colwidth="${w}" />`).join('')}</colgroup>`;

      // 注入 table 属性
      const cleanTableAttrs = tableAttrs.trim();
      const newTableAttrs = cleanTableAttrs
        ? `${cleanTableAttrs} colwidth='${JSON.stringify(colwidths)}'`
        : `colwidth='${JSON.stringify(colwidths)}'`;

      // 在 thead/tbody 内部各单元格注入 colwidth
      const updatedInner = tableInner.replace(
        /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi,
        (_rowMatch: string, rowAttrs: string, rowContent: string) => {
          let cellIdx = 0;
          const updatedRowContent = rowContent.replace(
            /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
            (cellMatch: string, tag: string, cellAttrs: string, cellInner: string) => {
              const w = colwidths[cellIdx] || null;
              cellIdx++;
              if (!w || /colwidth=/i.test(cellAttrs)) return cellMatch;
              const styleAttr = tag.toLowerCase() === 'th' ? ` style="width: ${w}px;"` : '';
              return `<${tag}${cellAttrs} colwidth="${w}"${styleAttr}>${cellInner}</${tag}>`;
            }
          );
          return `<tr${rowAttrs}>${updatedRowContent}</tr>`;
        }
      );

      // 检查是否已有 <colgroup>，若无则插入到表格开头
      const finalInner = /<colgroup/i.test(updatedInner)
        ? updatedInner
        : `${colgroupHtml}${updatedInner}`;

      return `<table ${newTableAttrs}>${finalInner}</table>`;
    }
  );

}

