/**
 * ProofSection — 能力证据（对齐 demo 的 features/proof/ProofSection）
 *
 * 文档介绍内容之一：每条能力对应上方可操作 Demo，或可在各 Demo 的「代码参考」中复核。
 * 不列举完整 API，也不编造对比数字。
 */
export function ProofSection() {
  return (
    <section className="chapter" id="proof" aria-labelledby="proof-title">
      <div className="chapter-head">
        <p className="step">能力证据</p>
        <h2 id="proof-title">宣传只停留在你刚刚看到的结果上。</h2>
        <p className="lede">
          每一条都对应上面的可操作场景，或可在各 Demo 的「代码参考」中复核。这里不列举完整 API，也不编造对比数字。
        </p>
      </div>
      <div className="proof-list">
        <article className="proof-item">
          <h3>流式写完，不必换渲染器</h3>
          <p>
            StreamingMarkdown 与 MarkdownContent 共用 remark 插件、预处理和主题作用域。在「流式渲染」里切换对照，
            即可看到同一份文稿的流式与静态结果完全一致。
          </p>
          <p className="why">收益：Agent 回复从打字到定稿，版式不会突然跳一下。</p>
        </article>
        <article className="proof-item">
          <h3>表格列宽能留下来，也可按同一套算法重算</h3>
          <p>
            拖列会写入 colwidth；列宽算法只根据当前表的结构和文案分配宽度，不替换内容。该算法与后端导出共用计算，
            仓库中基准用例偏差不超过 1px。
          </p>
          <p className="why">收益：屏幕上改过的列宽会被记下；需要时也可以套用与导出侧相同的算法。</p>
        </article>
        <article className="proof-item">
          <h3>法律草稿可以被收成结构</h3>
          <p>
            输入若在开头重复了与文书名全等的一级标题，stripLeadingDocumentTitle 会切掉这一处开头标题；
            普通段落里的同名文本不会被删除。「一、」和「诉讼请求：」由 normalizeLegalMarkdown 整理。
            这些规则只对中国公文书写习惯成立 —— 不做法律业务，整块跳过即可。
          </p>
          <p className="why">收益：模型常见的标题重复和层级混乱，不必在业务里再写一套正则。</p>
        </article>
        <article className="proof-item">
          <h3>主题是契约，不是一段 CSS 字符串</h3>
          <p>
            模板设置经 profileFromDocumentTemplate 变成 token；未知 key、分号或 url( 会被 themeStyle 拒绝。
            每张主题 Demo 底部都挂了一条注入被拦截的对照。
          </p>
          <p className="why">收益：后端可以换肤，但不能把样式注入带进页面。</p>
        </article>
      </div>
    </section>
  );
}

export default ProofSection;
