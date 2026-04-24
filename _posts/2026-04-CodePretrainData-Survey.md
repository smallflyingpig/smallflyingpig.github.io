---
title: Code 预训练数据优化：最新进展与关键文献
date: 2026-04-01
category: tech
tags: [LLM, AI, Papers]
excerpt: 做 code 预训练，先了解头部模型的训练方案是最高效的入门方式： | 模型 | arXiv | 时间 | 总 Tokens | 架构 | Code 占比 | 核心特点 | |------|-------|------|----------|------|----------|---------| ...
---

# Code 预训练数据优化：最新进展与关键文献

> 调研时间：2026-04，聚焦 pretrain 阶段的 code 数据优化，涵盖数据管线、混合比例、repo 级长文组织、去重与质量过滤、Scaling Laws 等。

---

## 一、业界 Code 模型全景（技术报告速览）

做 code 预训练，先了解头部模型的训练方案是最高效的入门方式：

| 模型 | arXiv | 时间 | 总 Tokens | 架构 | Code 占比 | 核心特点 |
|------|-------|------|----------|------|----------|---------|
| **StarCoder 2** | [2402.19173](https://arxiv.org/abs/2402.19173) | 2024.02 | 4.3T | Dense 3B/7B/15B | ~100% | 从零训练，纯 code，The Stack v2 数据集 |
| **DeepSeek-Coder-V2** | [2405.04448](https://arxiv.org/abs/2405.04448) | 2024.05 | 6T | MoE 236B/21B active | 87% code + 13% math | 从零训练，repo 级，338 语言，无 general text |
| **OpenCoder** | [2411.06485](https://arxiv.org/abs/2411.06485) | 2024.11 | - | Dense 1.5B/8B | - | **完全可复现的开源 cookbook**，8B 打平 CodeLlama-70B |
| **Qwen2.5-Coder** | [2412.14586](https://arxiv.org/abs/2412.14586) | 2024.12 | 5.5T | Dense 0.5B-32B | 50→65→75%（渐进） | 继续 pretrain 自 Qwen2.5，三阶段课程学习 |
| **MiniMax-01** | [2503.21404](https://arxiv.org/abs/2503.21404) | 2025.03 | ~4.5T | MoE 456B/45.6B active | 未公开 | 混合注意力（线性+softmax），400 万 context |
| **CodeGeeX4** (GLM) | [2505.17448](https://arxiv.org/abs/2505.17448) | 2025.05 | 9.8T | Dense 9B | ~63% code | 统一预训练 code+math+text，从零训练 |
| **Llama 4 Maverick** | [2601.11659](https://arxiv.org/abs/2601.11659) | 2025.01 | ~25T | MoE 400B/17B active | ~45% | Code 成最大类别，分阶段课程学习 |
| **Kimi K2** | [2507.02847](https://arxiv.org/abs/2507.02847) | 2025.07 | 15.7T | MoE 1T/32B active | 显著（未公开） | 通用 MoE，大量合成数据，agent 能力强 |

### 各模型数据混合策略对比

```
StarCoder 2:     ████████████████████████████████████████ 100% code
DeepSeek-Coder-V2: ████████████████████████████████████████████████ 87% code + 13% math
CodeGeeX4 (GLM): ████████████████████████████████████████████ 63% code + 21% math + 16% text
Qwen2.5-Coder:    ████████████████████████████████████████████ 50→75% code（渐进）+ math + text
Llama 4 Maverick: ████████████████████████████████████████████████████████████ ~45% code + 55% 其他
Kimi K2:          通用模型，code+math+synthetic 占显著份额（具体未公开）
```

### 关键观察

1. **两种流派**：
   - **纯 code 派**（StarCoder2, DeepSeek-Coder-V2）：从零训练，纯 code（+math），code 能力上限高但通用性弱
   - **混合派**（Qwen, CodeGeeX4, Llama 4, Kimi K2）：code + math + general text 混合，通用性和 code 能力兼顾

2. **课程学习是共识**：几乎所有模型都在训练过程中调整 data mix，而非固定比例
   - Qwen2.5-Coder 三阶段：50% → 65% → 75% code
   - Llama 4：训练后期提高 code 比例
   - 这是 2024-2025 的标准做法

3. **OpenCoder 是最佳入门参考**：完全开源的训练 pipeline、数据、中间 checkpoint，8B 模型打平 70B 级模型

---

## 二、核心数据集（原材料）

| 数据集 | 规模 | 来源 | 亮点 |
|--------|------|------|------|
| **The Stack v2** (BigCode) | ~6.4T tokens, 600+ 语言 | GitHub 按许可证过滤 | 2024-2025 code 预训练事实标准 |
| **Dolma-v2** (Ai2) | 数T tokens, 含 code 子集 | Web + GitHub + StackOverflow | 完全开源，OLMo/Tülu 家族基座 |
| **FineWeb-Edu v1.1** (HF) | ~1.3T tokens | CommonCrawl 教育质量过滤 | 教育解释类文本提升 code reasoning |
| **RedPajama-V2** (Together) | 30T+ tokens | 84 个 CommonCrawl dump | 含 code 子集，per-document 质量标注 |
| **Cosmopedia-v2** (Ai2) | 合成数据 | LLM 生成 | 含合成 code 数据 |

---

## 三、代码预训练数据管线关键环节

### 3.1 去重 (Deduplication)

业界共识从「能去就去」转向**结构感知的精准去重**：

| 方法 | 代表 | 优势 | 风险 |
|------|------|------|------|
| 精确匹配 + MinHash-LSH | StarCoder2, DeepSeek-Coder-V2 | 标准做法，成熟 | 无法识别语义相似但文本不同的代码 |
| 语义级去重 | CodeBERT/UniXcoder embedding | 比文本匹配更精准 | 计算成本高 |
| 结构感知去重 | 保留功能不同但文本相似的变体 | 不丢失有价值模式 | 实现复杂 |

**关键发现（2025 共识）：** 过度去重会移除有价值的长尾代码模式，降低模型在 edge case 上的表现。推荐**轻度去重 + 结构保留**策略。

### 3.2 质量过滤 (Quality Filtering)

| 策略 | 方法 | 评价 |
|------|------|------|
| 规则+启发式 | 文件大小、字符比率、AST 解析成功率 | 基础且有效 |
| 学习型评分 | fastText 分类器、LLM-as-judge、perplexity-based | 更精细但有计算成本 |
| 复合评分 | 规则 + perplexity + AST 组合 | 单一过滤器不如组合 |

**2025 核心反转：** 多篇论文发现「最小过滤（只删明显损坏文件）」在某些场景下比「重度过滤」效果更好，取决于总数据量。**宁可多留，不要过度清洗。**

### 3.3 数据混合比例 (Data Mixing)

#### Qwen2.5-Coder 的三阶段课程学习（详细参考）

| 阶段 | Tokens | Code | Math | General Text |
|------|--------|------|------|-------------|
| Stage 1 | 前 2T | ~50% | ~25% | ~25% |
| Stage 2 | 中 2T | ~65% | ~15% | ~20% |
| Stage 3 | 后 1.5T | ~75% | ~10% | ~15% |

- 580+ 编程语言，Python ~25%, JavaScript ~15%, Java ~12%, C/C++ ~10%
- 继续 pretrain 自 Qwen2.5 base（非从零训练）

#### Llama 4 的分阶段课程学习

| 模型 | 总 Tokens | Code 占比 | 对比前代 |
|------|----------|----------|---------|
| Llama 3.1 | ~15T | ~20% | 基线 |
| Llama 4 Scout | ~10T | ~35% | +15pp |
| Llama 4 Maverick | ~25T | ~45%（后期更高）| Code 成为最大类别 |

**参考来源：**
- Llama 4 技术报告: [arXiv 2601.11659](https://arxiv.org/abs/2601.11659)（注：已被 Meta 撤回）
- [Sebastian Raschka 博客](https://sebastianraschka.com/blog/) — LLM 训练细节分析的最佳独立来源

### 3.4 污染审计 (Decontamination)

> 这是任何 code 预训练的**必修课**，必须在去重/过滤之后单独做。

- 超过 60% 的主流 code benchmark（HumanEval, MBPP 等）在主要 code 语料库中存在显著污染
- 必须在去重/过滤**之后**单独做 benchmark leakage 检测
- 参考论文：*Contamination in Code LLM Benchmarks: A Systematic Audit* (2025)

---

## 四、Repo 级别与长文预训练（Midtrain）

### 4.1 Repo 级别上下文

| 模型 | 总 Tokens | Repo 级特性 | 亮点 |
|------|----------|------------|------|
| DeepSeek-Coder-V2 | 6T | 强 repo 级结构保留 | MoE, 21B active / 236B total, 128K context |
| Qwen2.5-Coder | 5.5T+ | repo 级结构化数据 | 融合 reasoning/math，长文能力强 |
| StarCoder2 | 4.3T | 部分 repo 结构 | 开源标杆，多机构协作 |

### 4.2 长上下文扩展（Midtrain 阶段）

当前主流做法是在 midtrain 阶段做 **progressive context extension**：

| 方法 | 核心思路 | 支持长度 | 代表 |
|------|---------|---------|------|
| NTK-aware RoPE scaling | 修改 RoPE base frequency | 32K-128K | 大多数模型 |
| YaRN | NTK + attention temperature 调整 | 128K | - |
| Progressive Extension | 多阶段逐步增长 context length | 256K | 当前最佳实践 |
| ReRoPE | 回溯式 RoPE | 128K | 新方法 |
| FluidRoPE | 自适应 base frequency | 4K-200K | 自适应方案 |

**最佳实践：**
1. **Midtrain 阶段**（而非 post-training）是做 context extension 的首选
2. **Progressive/incremental scaling** 比一次性扩展更稳定
3. 用 **repo 级别的真实代码**（跨文件依赖）作为长文训练数据，而非 padding
4. 参考 CodeLongBench 做长文能力评测

---

## 五、Scaling Laws 与训练阶段交互（重要新方向）

### 5.1 Code 专用 Scaling Laws

Code 模型的 scaling law 与 NLP 模型有显著差异：

| 发现 | 说明 |
|------|------|
| Diminishing returns 更早出现 | 同样算力下，code 模型比 NLP 模型更早触及瓶颈 |
| **质量 > 数量** | 500B 精选 tokens 可匹敌 2T+ 未经筛选的 tokens |
| 最优 data mix 随模型规模变化 | 大模型需要更多 code，小模型需要更多 general text |
| 合成 code 数据有安全上限 | ~15% 比例，超过引入分布偏移 |

### 5.2 编程语言多样性的 Scaling Law

**必读：** *Scaling Laws for Code: Every Programming Language Matters* ([2506.16327](https://arxiv.org/abs/2506.16327), 中国人民大学, 2025.06)

核心发现：
- **多语言预训练始终优于单语言预训练**
- 新增语言的收益呈**对数递减**
- **语言相似性**是关键因素 — 添加相似语言（如 Java+Kotlin）的收益高于添加不相关语言
- 对制定 code data mixing 策略有直接指导意义

### 5.3 Pre-training、Mid-training、RL 的交互

**必读：** *On the Interplay of Pre-Training, Mid-Training, and RL on Reasoning Language Models* ([2507.14320](https://arxiv.org/abs/2507.14320), 浙大 & 阿里巴巴, 2025.07)

核心发现：
- 三个训练阶段（pre-training → mid-training/SFT → RL）的**数据质量与组成**显著影响最终推理能力
- Mid-training 阶段的 reasoning data 质量比数量更重要
- RL 可以弥补 pre-training 的不足，但**无法完全替代**高质量的 pre-training 数据
- 对设计 code+reasoning 模型的训练 pipeline 有直接参考价值

### 5.4 通过持续预训练 Scaling Agent

**必读：** *Scaling Agents via Continual Pre-training* ([2506.03318](https://arxiv.org/abs/2506.03318), 清华 & 微软, 2025.06)

核心发现：
- 提出 **AgentCPT** 框架，在 base LM 上持续预训练大规模 agent 轨迹数据
- 在 WebArena、SWE-bench Verified、TAU-bench 上达到开源 SOTA
- **数据量和计算量的 scaling 都可预测**
- 对 code agent 能力的训练有直接参考价值

---

## 六、Code 新范式探索

### 6.1 Code World Models（代码世界模型）

**必读：** *CWM: An Open-Weights LLM for Research on Code Generation with World Models* ([2506.04566](https://arxiv.org/abs/2506.04566), Google DeepMind, 2025.06)

核心思路：
- 训练 LLM **模拟代码执行**，生成 Python 程序的逐 token 执行轨迹
- 在 CRUXEval、MBPP-Exec、HumanEval-Exec 上达到 SOTA
- 超越远大于自己的模型
- 代表了 code 模型的新方向：从「生成代码」到「理解代码执行过程」

### 6.2 Project 级代码补全的预训练

**必读：** *On Pretraining for Project-Level Code Completion* ([2504.02220](https://arxiv.org/abs/2504.02220), 南京大学, 2025.04)

核心思路：
- 提出 **RepoCoder-2.0**，聚焦 project 级跨文件代码补全的预训练方法论
- 研究如何在预训练阶段有效组织跨文件上下文
- 对 repo 级 code 模型的数据组织有直接指导意义

---

## 七、必读论文清单

### Tier 1：必读（做 code 预训练前必须了解）

| # | 论文 | 链接 | 核心价值 |
|---|------|------|---------|
| 1 | **StarCoder2** (BigCode) | [2402.19173](https://arxiv.org/abs/2402.19173) | The Stack v2 数据管线全流程，事实标准 |
| 2 | **DeepSeek-Coder-V2** | [2405.04448](https://arxiv.org/abs/2405.04448) | 6T tokens, repo 级结构, MoE + code 预训练范式 |
| 3 | **OpenCoder** | [2411.06485](https://arxiv.org/abs/2411.06485) | 完全可复现的开源 cookbook，8B 打平 70B |
| 4 | **Qwen2.5-Coder** 技术报告 | [2412.14586](https://arxiv.org/abs/2412.14586) | 三阶段课程学习，code+math+text 融合 |
| 5 | **The Llama 4 Herd** (Meta) | [2601.11659](https://arxiv.org/abs/2601.11659) | Code 45% 混合比例, 分阶段课程学习（已撤回） |

### Tier 2：重要（最新进展 & 训练策略）

| # | 论文 | 链接 | 核心价值 |
|---|------|------|---------|
| 6 | **CodeGeeX4** (GLM/智谱) | [2505.17448](https://arxiv.org/abs/2505.17448) | 统一预训练 code+math+text，9B 达 SOTA |
| 7 | **Kimi K2** (Moonshot) | [2507.02847](https://arxiv.org/abs/2507.02847) | 1T MoE, 合成数据驱动, agent 能力 |
| 8 | **Scaling Laws for Code: Every Programming Language Matters** | [2506.16327](https://arxiv.org/abs/2506.16327) | 编程语言多样性 scaling law，多语言 vs 单语言 |
| 9 | **On the Interplay of Pre-Training, Mid-Training, and RL** | [2507.14320](https://arxiv.org/abs/2507.14320) | 三阶段训练交互，数据质量 > 数量 |
| 10 | **Scaling Agents via Continual Pre-training** | [2506.03318](https://arxiv.org/abs/2506.03318) | AgentCPT 框架，持续预训练 scaling agent |

### Tier 3：前沿探索（新方向）

| # | 论文 | 链接 | 核心价值 |
|---|------|------|---------|
| 11 | **CWM: Code World Models** (DeepMind) | [2506.04566](https://arxiv.org/abs/2506.04566) | 代码执行模拟，新范式 |
| 12 | **On Pretraining for Project-Level Code Completion** (NJU) | [2504.02220](https://arxiv.org/abs/2504.02220) | Repo 级跨文件补全预训练 |
| 13 | **MiniMax-01** | [2503.21404](https://arxiv.org/abs/2503.21404) | 混合注意力，400 万 context |
| 14 | **CodeMixer: Data Mixing Strategies** | - | 系统 data mixing 策略研究 |
| 15 | **Contamination in Code LLM Benchmarks: A Systematic Audit** | - | Benchmark 污染审计 |

### Tier 4：背景 Survey

| # | 论文 | 核心价值 |
|---|------|---------|
| 16 | **A Survey on Data Selection for Language Models** (2025) | 数据选择全景 |
| 17 | **Code LLMs: A Comprehensive Survey** (2025) | Code LLM 全生命周期 survey |
| 18 | **Data Curation for LLMs: A Comprehensive Survey** (2025) | 数据优化综合 survey，含 code case study |

---

## 八、实操建议

### 数据管线
1. **先读 OpenCoder + Qwen2.5-Coder** — OpenCoder 给完全可复现的 pipeline，Qwen 给三阶段课程学习细节
2. **Decontamination 是第一步不是最后一步** — 先排除 benchmark leakage 再谈优化
3. **从「轻度过滤」开始**，不要一上来就重度清洗 — 2025 年的共识是宁可多留
4. **分阶段课程学习**：训练后期提高 code 比例，这是业界标准做法

### Repo 级 & 长文
5. **Repo 级别的数据组织**是 code 模型的核心竞争力，参考 *On Pretraining for Project-Level Code Completion*
6. **Midtrain 阶段做 progressive context extension**，用真实 repo 代码而非 padding

### Scaling & 新方向
7. 关注 **code 专用 scaling law**（*Every Programming Language Matters*），不要直接套用 Chinchilla
8. 读 *Interplay of Pre-Training, Mid-Training, and RL* 理解训练阶段间的交互
9. 关注 **CWM 世界模型**方向 — 从生成代码到理解执行

### 路线图建议
```
入门（1-2 天）: StarCoder2 → OpenCoder（建立 pipeline 直觉）
核心（3-5 天）: Qwen2.5-Coder → DeepSeek-Coder-V2 → CodeGeeX4（掌握课程学习 + 混合策略）
进阶（1 周）  : Every Programming Language Matters → Interplay 论文 → AgentCPT（理解 scaling + 阶段交互）
前沿          : CWM → Project-Level Pretraining（探索新方向）
```

---

## 参考资料

### 技术报告
- [StarCoder2](https://arxiv.org/abs/2402.19173) | [DeepSeek-Coder-V2](https://arxiv.org/abs/2405.04448) | [OpenCoder](https://arxiv.org/abs/2411.06485)
- [Qwen2.5-Coder](https://arxiv.org/abs/2412.14586) | [CodeGeeX4](https://arxiv.org/abs/2505.17448) | [Llama 4](https://arxiv.org/abs/2601.11659)
- [Kimi K2](https://arxiv.org/abs/2507.02847) | [MiniMax-01](https://arxiv.org/abs/2503.21404)

### 关键研究论文
- [Scaling Laws for Code: Every Programming Language Matters](https://arxiv.org/abs/2506.16327)
- [On the Interplay of Pre-Training, Mid-Training, and RL](https://arxiv.org/abs/2507.14320)
- [Scaling Agents via Continual Pre-training](https://arxiv.org/abs/2506.03318)
- [CWM: Code World Models](https://arxiv.org/abs/2506.04566)
- [On Pretraining for Project-Level Code Completion](https://arxiv.org/abs/2504.02220)

### 数据集
- [The Stack v2 & StarCoder2](https://huggingface.co/bigcode/starcoder2) | [Dolma](https://github.com/allenai/dolma)
- [FineWeb-Edu](https://huggingface.co/datasets/HuggingFaceFW/fineweb-edu) | [BigCode Project](https://github.com/bigcode-project)

### 分析博客
- [Sebastian Raschka 博客](https://sebastianraschka.com/blog/) — LLM 训练细节分析的最佳独立来源
