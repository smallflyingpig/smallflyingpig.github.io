---
title: Chain-of-Thought Prompting Elicits Reasoning in Large Language Models
date: 2022-01-01
category: tech
tags: [LLM, AI, Papers]
excerpt: - **标题**: Chain-of-Thought Prompting Elicits Reasoning in Large Language Models - **作者**: Jason Wei, Xuezhi Wang, Dale Schuurmans, Maarten Bosma, Bria...
---

# Chain-of-Thought Prompting Elicits Reasoning in Large Language Models

## 基本信息

- **标题**: Chain-of-Thought Prompting Elicits Reasoning in Large Language Models
- **作者**: Jason Wei, Xuezhi Wang, Dale Schuurmans, Maarten Bosma, Brian Ichter, Fei Xia, Ed H. Chi, Quoc V. Le, Denny Zhou
- **机构**: Google Research, Brain Team
- **发表时间**: NeurIPS 2022
- **论文链接**: https://arxiv.org/abs/2201.11903

## 一、研究背景与动机

大语言模型通过扩大规模获得了诸多收益，但仅靠扩大规模并不能在算术、常识和符号推理等挑战性任务上取得高性能。

本文受两个思想启发：

1. **算术推理可以从自然语言中间步骤中受益**：之前的工作通过从头训练（Ling et al., 2017）或微调（Cobbe et al., 2021）让模型生成自然语言中间步骤，或使用神经符号方法（形式语言而非自然语言）。
2. **大语言模型支持 in-context few-shot learning**：通过 few-shot prompting 可以让模型适配新任务。

但这两种方法各有局限：
- 生成 rationale 的训练/微调方法**成本高**（需要大量高质量推理步骤标注）
- 传统 few-shot prompting **在推理任务上效果差**，且不随模型规模提升而显著改善

**本文核心贡献**：将两种思想的优势结合起来，提出 **Chain-of-Thought Prompting**——在 few-shot exemplars 中提供包含中间推理步骤的 (input, chain of thought, output) 三元组。

## 二、核心贡献

1. 提出 Chain-of-Thought Prompting 方法：通过在 few-shot exemplars 中加入中间推理步骤，让模型生成 chain of thought，从而显著提升复杂推理能力
2. 证明 chain-of-thought reasoning 是**模型规模涌现的能力**（emergent ability），仅在 ~100B 参数模型上才有显著收益
3. 在算术、常识、符号推理三大类任务上验证了有效性，PaLM 540B 在 GSM8K 上达到 SOTA（超越 finetuned GPT-3 + verifier）

## 三、方法详解

### 3.1 方法定义

**Chain of Thought**：一系列中间自然语言推理步骤，逐步导向最终答案。

**Chain-of-Thought Prompting**：在 few-shot prompting 的 exemplars 中，每个样本包含 (input, chain of thought, output) 三元组，而非传统的 (input, output) 对。

对比示例（Figure 1）：

**Standard Prompting**:
```
Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can has 3 tennis balls. How many tennis balls does he have now?
A: The answer is 11.
```

**Chain-of-Thought Prompting**:
```
Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can has 3 tennis balls. How many tennis balls does he have now?
A: Roger started with 5 balls. 2 cans of 3 tennis balls each is 6 tennis balls. 5 + 6 = 11. The answer is 11.
```

### 3.2 CoT Prompting 的四条吸引力

1. **分解多步问题**：将复杂问题分解为中间步骤，为需要更多推理的问题分配额外计算
2. **可解释性**：提供模型行为的可解释窗口，便于调试推理路径错误
3. **广泛适用**：适用于数学应用题、常识推理、符号操作，原则上适用于人类可通过语言解决的所有任务
4. **即插即用**：只需在 few-shot exemplars 中加入 chain of thought 示例，无需微调

### 3.3 实验设置

**基准数据集**：

| 类别 | 数据集 | 说明 |
|------|--------|------|
| 算术推理 | GSM8K, SVAMP, ASDiv, AQuA, MAWPS | 数学应用题 |
| 常识推理 | CSQA, StrategyQA, Date Understanding, Sports Understanding, SayCan | 多类常识任务 |
| 符号推理 | Last Letter Concatenation, Coin Flip | 玩具任务 |

**语言模型**：GPT-3 (350M~175B)、LaMDA (422M~137B)、PaLM (8B~540B)、UL2 220B、Codex

## 四、实验设计与结果

### 4.1 算术推理结果

**三个关键发现**：

1. **涌现能力**：CoT prompting 对小模型无正向效果，仅在 ~100B 参数模型上产生显著收益。小模型产生流畅但不合逻辑的 chain of thought，反而降低性能
2. **问题越复杂收益越大**：GSM8K（最难）上 GPT-3 175B 和 PaLM 540B 性能翻倍；SingleOp（最简单，单步）上几乎无提升
3. **媲美 SOTA**：PaLM 540B + CoT prompting 在 GSM8K、SVAMP、MAWPS 上达到或超过之前需要 finetuning 的 SOTA

**GSM8K 核心结果**：
- PaLM 540B + CoT (8 exemplars): **58%** (当时 SOTA)
- Finetuned GPT-3 175B + verifier: 55%
- Prior best supervised: 57%
- PaLM 540B + Standard prompting: 18%

### 4.2 消融实验（Figure 5）

| 变体 | 说明 | 效果 |
|------|------|------|
| Equation only | 只输出数学等式 | GSM8K 上几乎无帮助（语义太复杂，无法直接翻译为等式）；简单任务上有帮助 |
| Variable compute only | 输出与等式等长的 `...` | 与 baseline 持平，说明仅增加计算量不够，自然语言中间步骤有独特价值 |
| CoT after answer | 答案后再给 chain of thought | 与 baseline 持平，说明顺序推理过程本身有用，不仅是激活知识 |

**结论**：CoT prompting 的成功**不仅仅**是因为产生了可计算的等式、增加了 token 数、或激活了预训练知识，中间自然语言推理步骤的顺序性至关重要。

### 4.3 鲁棒性分析（Figure 6）

- 不同标注者独立写的 chain of thought 均大幅超越 baseline
- 简洁风格 vs 详细风格均有效
- 从 GSM8K 训练集随机采样的 exemplars 也表现相当
- 对 exemplar 顺序和数量也具有鲁棒性

### 4.4 常识推理结果（Figure 7）

- PaLM 540B + CoT 在 StrategyQA 上达到 75.6%（SOTA 69.4%）
- 在 Sports Understanding 上达到 95.4%（人类水平 84%）
- 在 CSQA 上收益较小
- CoT prompting 对常识推理同样有效，得益于其基于语言的特性

### 4.5 符号推理结果（Figure 8）

- **In-domain**（与 exemplar 步数相同）：PaLM 540B + CoT 接近 100% 解决率
- **Out-of-domain**（步骤数更多）：Standard prompting 完全失败，CoT prompting 实现长度泛化
- 小模型即使在 in-domain 也失败，说明符号操作能力仅在 ~100B 规模涌现

### 4.6 错误分析

对 LaMDA 137B 在 GSM8K 上的分析：
- 正确答案中：96% 的 chain of thought 逻辑正确（50 个样本）
- 错误答案中：46% 的 chain of thought 几乎正确（有小错误如计算器错误、符号映射错误、缺少一步），54% 有重大语义理解或连贯性错误
- PaLM 从 62B 扩展到 540B 修复了大量单步缺失和语义理解错误

## 五、关键创新点

1. **Chain-of-Thought Prompting 范式**：首次系统性地在 few-shot prompting 中引入中间推理步骤，无需任何训练/微调
2. **涌现能力验证**：通过大量实验证明 CoT reasoning 是大模型规模的涌现属性，小模型无法通过 prompt 获得此能力
3. **消融实验揭示机制**：证明了自然语言中间步骤的独特价值，排除了等式生成、增加计算量、知识激活等替代解释

## 六、局限性与未来工作

1. **是否真正"推理"**：CoT 模拟人类思考过程，但不等于神经网络真正在"推理"，仍为开放问题
2. **标注成本**：few-shot 设置下成本可接受，但大规模 finetuning 场景可能代价高昂（可通过合成数据或 zero-shot 泛化缓解）
3. **无正确性保证**：chain of thought 可能产生不正确的推理路径，导致错误答案
4. **部署成本高**：CoT reasoning 仅在大规模模型上涌现，实际应用成本高；如何在更小模型上诱导推理能力是重要方向

## 七、个人思考

（待填写）

## 脑图结构

```mermaid
mindmap
  root((Chain-of-Thought Prompting))
    研究背景
      大模型规模≠推理能力
      rationale生成需训练
      few-shot prompting不适用于推理
    核心方法
      (input, CoT, output) 三元组
      自然语言中间推理步骤
      无需训练/微调
    关键发现
      涌现能力(~100B)
      问题越复杂收益越大
      自然语言步骤不可替代
    实验验证
      算术推理(GSM8K等)
      常识推理(CSQA等)
      符号推理(长度泛化)
    消融实验
      Equation only
      Variable compute only
      CoT after answer
    局限性
      大模型成本高
      无正确性保证
      真正推理？
```

> 💡 **提示**：可将上述 Mermaid 代码粘贴到 [Mermaid Live Editor](https://mermaid.live/) 或支持 Mermaid 的编辑器中查看

## 相关论文

- Self-Consistency improves chain of thought reasoning in language models (Wang et al., 2022) — CoT 的后续改进
- STaR: Bootstrapping Reasoning with Reasoning (Zelikman et al., 2022) — 自动生成 CoT 数据
- Training verifiers to solve math word problems (Cobbe et al., 2021) — GSM8K 基准
- Emergent abilities of large language models (Wei et al., 2022) — 涌现能力理论

## 参考文献

（见原论文 References 部分）
