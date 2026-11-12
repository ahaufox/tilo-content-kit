---
name: perf-optimization
description: 性能优化工作流 / Measurement-Driven Performance Optimization。遵循测量驱动四步法：建立基准(Benchmark)→定位瓶颈(Bottleneck)→实施优化(Optimize)→验证测量(Verify)。适用场景：页面加载慢/API响应慢需要排查、数据库查询性能优化、前端渲染性能优化、内存泄漏排查、CPU/GPU使用率异常、系统吞吐量提升。关键词：性能优化/性能调优/基准测试/瓶颈分析/数据库优化/前端性能/内存优化/performance optimization/benchmark/bottleneck analysis/profiling/speed optimization/latency reduction。
---

# 性能优化 (Performance Optimization)

## 何时使用

- 需要缩短接口响应时间
- 需要减少内存占用
- 涉及算法改进或代码重构

## 执行步骤

### 1. 建立基准
进行代码修改前，先建立可重现的性能基线，记录执行时间和内存消耗。

### 2. 定位瓶颈
通过 Profiler 数据精确找出耗时最长或内存分配最多的代码段，严禁过早优化。

### 3. 实施优化
在瓶颈处应用优化策略：
- **底层替代**：优先使用 C 实现的底层库函数替代原生循环
- **空间换时间**：使用缓存或预计算数据结构
- **算法降维**：评估降低时间复杂度

### 4. 验证与二次测量
- 运行全部单元测试确保逻辑正确
- 使用与基线完全相同的工具和数据重新测量
- 报告明确的优化比例

## 核心规则

- **禁止无基准优化**：未提供修改前耗时数据，严禁合并性能优化 PR
- **禁止逻辑牺牲**：严禁为微小性能提升大幅牺牲可读性和可维护性

## 输入参数

| 参数名 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `target_path` | `string` | - | 待优化代码路径 |
| `benchmark_data` | `string` | - | 基线性能数据 |
| `optimization_goal` | `string` | `latency` | 优化目标：latency / memory / both |

## 输出示例

```json
{
  "status": "success",
  "message": "性能优化完成",
  "data": {
    "baseline": "12.5s",
    "optimized": "0.3s",
    "improvement": "41x",
    "tests_passed": true
  }
}
```
