# 好测试与坏测试

## 好测试

**集成风格**：通过真实接口测，不要 mock 内部部件。

```typescript
// 好：测的是可观察的行为
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

特征：

- 测的是用户/调用方关心的行为
- 只用公共 API
- 内部重构后还活得好好的
- 描述 WHAT（是什么），不是 HOW（怎么做）
- 一条测试一个逻辑断言

## 坏测试

**实现细节测试**：与内部结构耦合。

```typescript
// 差：测的是实现细节
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

红旗：

- mock 内部协作者
- 测私有方法
- 在调用次数/顺序上做断言
- 行为没变、只是重构，测试就挂
- 测试名描述 HOW 而不是 WHAT
- 绕开接口、走外部手段验证

```typescript
// 差：绕开接口去验证
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// 好：通过接口验证
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```
