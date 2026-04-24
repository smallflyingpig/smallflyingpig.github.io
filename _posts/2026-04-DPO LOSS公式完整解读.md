---
title: DPO LOSS公式完整解读
date: 2026-04-01
category: tech
tags: [LLM, AI, Papers]
excerpt: $$\mathcal{L}_{DPO} = -\mathbb{E}_{(x, y_w, y_l)} \left[ \log \sigma \left( \beta \log \frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)} - \beta \log \frac{\...
---

# DPO LOSS公式完整解读

## 一、公式

$$\mathcal{L}_{DPO} = -\mathbb{E}_{(x, y_w, y_l)} \left[ \log \sigma \left( \beta \log \frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)} - \beta \log \frac{\pi_\theta(y_l|x)}{\pi_{ref}(y_l|x)} \right) \right]$$

## 二、符号说明

| 符号 | 含义 |
|------|------|
| $x$ | 用户输入（prompt） |
| $y_w$ | 偏好回复（chosen / winner） |
| $y_l$ | 非偏好回复（rejected / loser） |
| $\pi_\theta$ | 当前策略（正在优化的模型） |
| $\pi_{ref}$ | 参考策略（SFT 模型，固定不变） |
| $\sigma(\cdot)$ | Sigmoid 函数 $\frac{1}{1+e^{-x}}$ |
| $\beta$ | 温度参数，控制 KL 约束强度 |

## 三、直观理解

### 简化为三个关键部分

```
损失 = -log(sigmoid( 偏好回复的提升  -  非偏好回复的提升 ))
                         ↑                      ↑
                    想让它大                想让它小
```

### 符号含义对照

| 符号 | 直观含义 |
|------|----------|
| $\log \frac{\pi_\theta(y_w)}{\pi_{ref}(y_w)}$ | 偏好回复的概率提升了多少 |
| $\log \frac{\pi_\theta(y_l)}{\pi_{ref}(y_l)}$ | 非偏好回复的概率提升了多少 |
| 两者相减 | 偏好回复比非偏好回复"好多少" |
| $\sigma(\cdot)$ | 把差异映射到 [0,1] 区间 |
| $-\log(\cdot)$ | 让括号内越大越好 |

### 优化目标

**最小化损失 = 最大化括号内值 = 让偏好回复概率 ↑，非偏好回复概率 ↓**

```
初始状态:
  P(偏好回复) = 30%     P(非偏好回复) = 50%

优化后:
  P(偏好回复) = 50% ↑   P(非偏好回复) = 30% ↓
```

## 四、具体数值例子

假设参考模型 $\pi_{ref}$ 和当前模型 $\pi_\theta$ 对两个回复的概率：

| | $\pi_{ref}$ | $\pi_\theta$ (初始) | $\pi_\theta$ (优化后) |
|--|-------------|---------------------|----------------------|
| $y_w$ (偏好) | 0.3 | 0.3 | **0.5** ↑ |
| $y_l$ (非偏好) | 0.5 | 0.5 | **0.3** ↓ |

计算 log ratio：

- 初始：$\log\frac{\pi_\theta(y_w)}{\pi_{ref}(y_w)} = \log\frac{0.3}{0.3} = 0$
- 初始：$\log\frac{\pi_\theta(y_l)}{\pi_{ref}(y_l)} = \log\frac{0.5}{0.5} = 0$
- 优化后：$\log\frac{\pi_\theta(y_w)}{\pi_{ref}(y_w)} = \log\frac{0.5}{0.3} \approx 0.51$
- 优化后：$\log\frac{\pi_\theta(y_l)}{\pi_{ref}(y_l)} = \log\frac{0.3}{0.5} \approx -0.51$

损失变化：

- 初始：$-\log\sigma(0 - 0) = -\log(0.5) \approx 0.69$
- 优化后：$-\log\sigma(0.51 - (-0.51)) = -\log\sigma(1.02) \approx 0.26$ ✓ 损失降低

## 五、β 的作用

| β 值 | 效果 |
|------|------|
| β 大 | 越保守，模型变化小（强 KL 约束） |
| β 小 | 越激进，模型可能过拟合偏好数据 |
| 典型值 | 0.1 ~ 0.5 |

## 六、完整推导过程

### Step 1: KL 约束下的最优策略

**原始优化目标：**

$$\max_\pi \mathbb{E}_{x \sim \mathcal{D}, y \sim \pi(\cdot|x)}[r(x,y)] - \beta \cdot \mathbb{E}_{x \sim \mathcal{D}}[\text{KL}(\pi(\cdot|x) || \pi_{ref}(\cdot|x))]$$

**KL 散度定义：**

$$\text{KL}(\pi || \pi_{ref}) = \sum_y \pi(y|x) \log \frac{\pi(y|x)}{\pi_{ref}(y|x)}$$

**展开 KL 项：**

注意：$y$ 是从 $\pi(\cdot|x)$ 采样的，所以：

$$\sum_y \pi(y|x) \log \frac{\pi(y|x)}{\pi_{ref}(y|x)} = \mathbb{E}_{y \sim \pi(\cdot|x)}\left[\log \frac{\pi(y|x)}{\pi_{ref}(y|x)}\right]$$

**更严谨的优化目标写法：**

$$\max_\pi \mathbb{E}_{x \sim \mathcal{D}} \left[ \mathbb{E}_{y \sim \pi(\cdot|x)}[r(x,y)] - \beta \cdot \text{KL}(\pi(\cdot|x) || \pi_{ref}(\cdot|x)) \right]$$

展开 KL：

$$= \max_\pi \mathbb{E}_{x \sim \mathcal{D}} \left[ \mathbb{E}_{y \sim \pi}[r(x,y)] - \beta \cdot \mathbb{E}_{y \sim \pi}\left[\log \frac{\pi(y|x)}{\pi_{ref}(y|x)}\right] \right]$$

合并期望：

$$= \max_\pi \mathbb{E}_{x \sim \mathcal{D}, y \sim \pi} \left[ r(x,y) - \beta \log \frac{\pi(y|x)}{\pi_{ref}(y|x)} \right]$$

### Step 2: 用拉格朗日乘子法求最优解

引入拉格朗日乘子 $\lambda(x)$ 保证 $\sum_y \pi(y|x) = 1$：

$$\mathcal{L} = \sum_y \pi(y|x) \left[ r(x,y) - \beta \log \frac{\pi(y|x)}{\pi_{ref}(y|x)} \right] + \lambda(x) \left( \sum_y \pi(y|x) - 1 \right)$$

对 $\pi(y|x)$ 求偏导：

$$\frac{\partial \mathcal{L}}{\partial \pi(y|x)} = r(x,y) - \beta \log \frac{\pi(y|x)}{\pi_{ref}(y|x)} - \beta + \lambda(x) = 0$$

解得：

$$\log \frac{\pi(y|x)}{\pi_{ref}(y|x)} = \frac{r(x,y)}{\beta} + \frac{\lambda(x) - \beta}{\beta}$$

$$\pi(y|x) = \pi_{ref}(y|x) \cdot e^{r(x,y)/\beta} \cdot e^{(\lambda(x) - \beta)/\beta}$$

利用归一化条件 $\sum_y \pi(y|x) = 1$，设 $Z(x) = \sum_y \pi_{ref}(y|x) e^{r(x,y)/\beta}$：

$$\boxed{\pi^*(y|x) = \frac{1}{Z(x)} \pi_{ref}(y|x) \cdot e^{r(x,y)/\beta}}$$

### Step 3: 反解奖励函数

从最优策略表达式中反解奖励函数：

$$r(x,y) = \beta \log \frac{\pi^*(y|x)}{\pi_{ref}(y|x)} + \beta \log Z(x)$$

**关键洞察**：$\beta \log Z(x)$ 只与 $x$ 有关，与 $y$ 无关，在 Bradley-Terry 模型中会消掉！

### Step 4: 代入 Bradley-Terry 模型

人类偏好概率：

$$p(y_w \succ y_l | x) = \sigma(r(x, y_w) - r(x, y_l))$$

代入隐式奖励（$Z(x)$ 项消掉）：

$$p(y_w \succ y_l | x) = \sigma\left(\beta \log \frac{\pi(y_w|x)}{\pi_{ref}(y_w|x)} - \beta \log \frac{\pi(y_l|x)}{\pi_{ref}(y_l|x)}\right)$$

### Step 5: 最大似然估计

最大化偏好数据的对数似然：

$$\mathcal{L}_{DPO} = -\mathbb{E}\left[\log p(y_w \succ y_l | x)\right]$$

得到最终公式：

$$\boxed{\mathcal{L}_{DPO} = -\mathbb{E}\left[\log \sigma\left(\beta \log \frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)} - \beta \log \frac{\pi_\theta(y_l|x)}{\pi_{ref}(y_l|x)}\right)\right]}$$

## 七、与 PPO 的联系

PPO 优化目标：

$$\max_\pi \mathbb{E}[r(x,y)] - \beta \cdot \text{KL}(\pi || \pi_{ref})$$

DPO 的 $\beta \log \frac{\pi}{\pi_{ref}}$ 正是这个 KL 约束下最优奖励函数的**闭式解**。

| 方面 | PPO | DPO |
|------|-----|-----|
| 奖励模型 | 需要显式训练 | 不需要（隐式） |
| 参考模型 | 需要（KL 约束） | 需要（计算对数比率） |
| 价值模型 | 需要（优势估计） | 不需要 |
| 训练稳定性 | 需要精细调参 | 相对稳定 |
| 计算开销 | 高 | 低 |

## 八、一句话总结

**DPO 通过对比"偏好回复的概率提升"和"非偏好回复的概率降低"，直接优化人类偏好，无需显式奖励模型。**
