# 何时使用 Mock

只在**系统边界**使用 mock：

- 外部 API（支付、邮件等）
- 数据库（偶尔 —— 优先用测试库）
- 时间/随机
- 文件系统（偶尔）

不要 mock：

- 自己的类/模块
- 内部协作者
- 任何你控制的东西

## 为可测性而设计

在系统边界，把接口设计成易 mock 的：

**1. 用依赖注入**

把外部依赖传进来，不要在内部创建：

```typescript
// 易 mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// 难 mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. 优先用 SDK 风格的接口，而不是泛化 fetcher**

为每个外部操作创建专门函数，而不是一个带条件逻辑的泛化函数：

```typescript
// 好：每个函数都能独立 mock
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// 差：mock 时需要在 mock 内部写条件
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

SDK 风格带来的好处：
- 每个 mock 返回一个固定形状
- 测试设置里没有条件逻辑
- 更容易看清一条测试覆盖了哪些 endpoint
- 端点级的类型安全
