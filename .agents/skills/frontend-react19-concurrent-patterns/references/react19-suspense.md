---
title: React 19 异步数据获取（Suspense for Data Fetching）模式参考规范
---

# React 19 异步数据获取（Suspense for Data Fetching）模式参考规范

React 19 对 **数据获取（Data Fetching）** 的 Suspense 集成提供了原生支持，允许组件在数据就绪前挂起（暂停渲染），从而摆脱繁琐的 `useEffect` + `useState` 声明。

> [!WARNING]
> **架构核心规约：在任何前端 UI 组件中，禁止直接依赖并调用底层的 `api/client`！**  
> 所有数据请求必须封装在统一的 Query Hook（如 React Query 的 `useSuspenseQuery` / `useQuery`）中，或通过专门的数据服务层（Data Access Layer）暴露，以此隔绝 HMR（热更新）引起的模块加载死锁与不必要的组件层耦合。

---

## React 19 带来了什么改变？

在 React 18 中，Suspense 主要用于**代码分割**（即 `React.lazy` 组件加载）。而 React 19 将其延伸至**数据获取**，主要支持两种模式：
1. **使用支持 Suspense 的数据请求库**：如 React Query 5+、SWR。
2. **使用 React 19 新的 `use()` 钩子**：直接在组件内解包 Promise。通过 `use(promise)`，React 能够自动捕获其挂起状态。

---

## 核心模式 1：使用 `use()` 消费 Promise（基础模式）

```jsx
import { use, useMemo, Suspense } from 'react';

// 基础组件：挂起等待 Promise 完成
function DataComponent({ dataPromise }) {
  // use() 会在 promise 处于 pending 状态时自动挂起组件
  const data = use(dataPromise);
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

export default function App() {
  // 必须使用 useMemo 缓存 Promise，避免每次渲染重复创建导致无限加载死循环
  const dataPromise = useMemo(() => fetch('/api/data').then(res => res.json()), []);

  return (
    <Suspense fallback={<div>加载中...</div>}>
      <DataComponent dataPromise={dataPromise} />
    </Suspense>
  );
}
```

> [!IMPORTANT]
> **性能防范**：如果 Promise 是在组件渲染期间直接创建的（如直接在组件内 `use(fetch(...))`），每次渲染都会生成新的 Promise，从而导致无限挂起和重复渲染。因此必须配合 `useMemo` 或将 Promise 在组件外部定义。

---

## 核心模式 2：与 React Query 5+ 集成（推荐模式）

根据 [frontend-v2 架构规范](../../../rules/frontend-v2-structure.md)，**严禁在 UI 组件内部直接调用底层 `api/client`**。推荐通过专门的自定义 Query Hook 封装数据请求。

### 1. 正确推荐的做法（封装 Query Hook）

首先在数据层（如 `src/lib/queries/`）定义业务专属 Hook：

```typescript
// src/lib/queries/case.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client'; // 仅在 queries 数据层导入 api/client
import { queryKeys } from '@/lib/queries/keys';

export function useSuspenseCaseDetail(caseId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.cases.detail(caseId),
    queryFn: async () => {
      const res = await api.getCase(caseId);
      if (!res.data?.success) {
        throw new Error(res.data?.message || '获取案件详情失败');
      }
      return res.data.data;
    },
  });
}
```

然后在 UI 组件中直接消费，保持组件逻辑的纯粹性：

```tsx
// src/components/CaseDetail.tsx
import { useSuspenseCaseDetail } from '@/lib/queries/case';

export function CaseDetail({ caseId }: { caseId: string }) {
  // 组件会自动挂起，不需要在组件内做 isLoading 的状态判断或数据为空的兼容处理
  const caseData = useSuspenseCaseDetail(caseId);
  
  return (
    <div>
      <h1>{caseData.case_name}</h1>
      <p>{caseData.case_type}</p>
    </div>
  );
}
```

### 2. 禁用的反模式（严禁在组件内直连 api/client）

```tsx
// ❌ 错误的反模式：在组件内直连 api 并调用
import { api } from '@/lib/api/client'; // ❌ 违规导入：UI 组件禁止直接依赖底层 api 客户端
import { useSuspenseQuery } from '@tanstack/react-query';

function BadComponent({ caseId }) {
  const { data } = useSuspenseQuery({
    queryKey: ['case', caseId],
    queryFn: () => api.getCase(caseId), // ❌ 严禁组件内直连 api/client
  });
  return <div>{data?.case_name}</div>;
}
```

---

## 核心模式 3：嵌套 Suspense 边界与独立加载

利用多个 `Suspense` 边界，可以实现局部 UI 独立挂起，避免因某一个慢请求阻塞整个页面的渲染：

```tsx
function CaseWorkbench({ caseId }) {
  return (
    <div className="flex gap-4">
      {/* 案件基本信息优先渲染 */}
      <Suspense fallback={<CaseInfoSkeleton />}>
        <CaseInfoSection caseId={caseId} />
      </Suspense>
      
      {/* 慢速的 AI 分析结果独立挂起 */}
      <Suspense fallback={<AiAnalysisSkeleton />}>
        <AiAnalysisSection caseId={caseId} />
      </Suspense>
    </div>
  );
}
```

---

## 核心模式 4：与 Error Boundary（错误边界）结合

配合 React 19 的 Suspense，数据请求的异常应该被上层的 `ErrorBoundary` 统一捕获，从而实现“渲染 loading”与“渲染 error”的解耦。

```tsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useSuspenseCaseDetail } from '@/lib/queries/case';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-md">
      <p>数据加载出错:</p>
      <pre className="text-xs">{error.message}</pre>
      <button onClick={resetErrorBoundary} className="mt-2 px-3 py-1 bg-red-600 text-white rounded">
        重试
      </button>
    </div>
  );
}

function CaseDetail({ caseId }) {
  const caseData = useSuspenseCaseDetail(caseId);
  return <div>{caseData.case_name}</div>;
}

function PageContainer({ caseId }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<LoadingSpinner />}>
        <CaseDetail caseId={caseId} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## 开发避坑与规范指南

1. **禁止在组件层直连 api/client**
   * 所有的 API 写操作和读操作均必须经由 `lib/queries/`（通过 React Query 的 mutations/queries 封装）或特定路由的专用 `hooks/`。组件层严禁直接调用底层的 `api`。
   * 直接或动态 `import('@/lib/api/client')` 会在 HMR 更新时造成加载失效，直接导致热重载中断报错。
2. **严防 Promise 无限重建**
   * 如果使用原生 `use(promise)`，请确保 Promise 被 `useMemo` 缓存或提升到组件生命周期外。
3. **配合 Error Boundary**
   * Suspense 挂起后，若 Promise 发生 Reject（请求失败），React 会将其作为渲染期异常向上抛出。如果组件树中没有包裹 `ErrorBoundary`，会导致整个页面白屏崩溃。
