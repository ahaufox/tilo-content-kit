---
name: frontend-react19-concurrent-patterns
description: 'React 18/19 并发模式与最新 API 专项技能 / React Concurrent Patterns & React 19 API migration。保持 React 18 并发模式最佳实践，在迁移时采纳 React 19 新 API。适用场景：React 18→19 版本迁移、并发渲染(Concurrent Rendering)性能优化、Suspense 数据流模式、Server Components 架构设计、useTransition/useDeferredValue/useOptimistic 使用、Actions 模式实现。关键词：React 19/React 18/并发模式/Concurrent/Suspense/useTransition/useOptimistic/Server Components/Actions/useDeferredValue/React升级。'
---

# React 19 并发模式

## 核心约束与执行标准

### 严格边界与禁止项

1. **严格禁止**在未经验证的情况下删除核心业务逻辑或约束。
2. **严格禁止**输出与该技能目标无关的代码。
3. **必须**保证输出内容符合系统设定的高可用与安全性标准。

## 第一部分 保持：必须保留的 React 18 并发模式

这些模式存在于 React 18 代码库中，在迁移期间不能被意外移除或破坏：

### createRoot 已由 R18 编排器迁移

如果 R18 编排器已运行，`ReactDOM.render` → `createRoot` 的转换已完成。验证其正确性：

```jsx
// 正确的 React 19 根（与 React 18 相同）：
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### useTransition 无需迁移

React 18 的 `useTransition` 在 React 19 中以相同方式工作。在迁移期间不要更改这些模式：

```jsx
// React 18 useTransition 在 React 19 中无需更改：
const [isPending, startTransition] = useTransition();

function handleClick() {
  startTransition(() => {
    setFilteredResults(computeExpensiveFilter(input));
  });
}
```

### useDeferredValue 无需迁移

```jsx
// React 18 useDeferredValue 在 React 19 中无需更改：
const deferredQuery = useDeferredValue(query);
```

### 代码分割的 Suspense 无需迁移

```jsx
// React 18 Suspense with lazy 在 React 19 中无需更改：
const LazyComponent = React.lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <LazyComponent />
    </Suspense>
  );
}
```

---

## 第二部分 React 19 新 API

这些值得在迁移后的清理冲刺中采纳。在迁移期间不要引入这些 API —— 先稳定下来。

有关每个新 API 的完整模式，请阅读：
- **`references/react19-use.md`** —— `use()` hook 用于 promises 和 context
- **`references/react19-actions.md`** —— Actions、useActionState、useFormStatus、useOptimistic
- **`references/react19-suspense.md`** —— Suspense 用于数据获取（新模式）

## 迁移安全规则

在 React 19 迁移本身期间，这些并发模式必须**完全保持不动**：

```bash
# 验证迁移期间没有更改这些：
grep -rn "useTransition\|useDeferredValue\|Suspense\|startTransition" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."
```

如果迁移器更改了任何这些文件，请审查更改 —— 迁移应该只修改 React API 表面（forwardRef、defaultProps 等），永远不要修改并发模式逻辑。

## 思维链引导

在执行复杂步骤、架构设计或遇到歧义时，必须通过 `<thought>` 标签显式输出你的思考过程和逻辑推导，然后再输出最终行动或代码方案。
