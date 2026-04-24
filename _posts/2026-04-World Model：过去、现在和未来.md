---
title: World Model：过去、现在和未来
date: 2026-04-01
category: tech
tags: [LLM, AI, Papers]
excerpt: World Model（世界模型）是当前具身智能（Embodied AI）领域最受关注的技术路线之一。从 LeCun 提出 JEPA、OpenAI 用 Sora 定义"视频生成即世界模拟器"，到 DeepMind 用 Genie 生成可交互环境，这条路线在近三年快速演进。本文梳理 World Mod...
---

# World Model：过去、现在和未来

World Model（世界模型）是当前具身智能（Embodied AI）领域最受关注的技术路线之一。从 LeCun 提出 JEPA、OpenAI 用 Sora 定义"视频生成即世界模拟器"，到 DeepMind 用 Genie 生成可交互环境，这条路线在近三年快速演进。本文梳理 World Model 要解决的核心问题、主流技术路线、里程碑式工作，以及未来发展方向。

---

## 一、World Model 要解决什么问题

### 1.1 核心直觉：让机器拥有"想象力"

World Model 的本质是一个**环境模拟器**——它让智能体能够**在脑中预演**"如果我做了这个动作，世界会怎样变化"，从而在不真正执行的情况下进行规划和决策。

类比人类：你在倒水之前，大脑里已经模拟了"倾斜水壶→水流出→杯子满"的过程。World Model 就是让机器人也具备这种能力。

### 1.2 传统具身智能的瓶颈

传统的具身智能路线是 **感知→决策→执行**（perception-action loop），存在三个根本性瓶颈：

1. **试错成本高**：真实世界试错代价大（摔坏东西、伤到人），强化学习的样本效率极低
2. **长程规划困难**：复杂任务需要多步规划，每一步的不确定性会累积放大
3. **泛化能力差**：在新环境中缺乏对"世界如何运作"的理解，换个场景就失效

### 1.3 World Model 的解法

World Model 通过**学会"世界运行的规律"**，让智能体可以在"想象"中试错和规划，大幅降低对真实交互的依赖：

```
传统路线：  感知 → 决策 → 执行 → 观察结果（真实世界，成本高）
World Model：感知 → 决策 → 想象结果 → 评估 → 再决策 → 最终执行（想象中试错，成本低）
```

> LeCun：*"A system that cannot imagine the consequences of its actions cannot be said to be intelligent."*
> （一个不能想象自己行动后果的系统，不能被称为智能。）

### 1.4 World Model 的价值定位

World Model 在具身智能中的角色定位：

| 角色 | 说明 |
|------|------|
| **训练加速器** | 用想象 rollout 替代真实交互，加速策略训练（model-based RL） |
| **规划引擎** | 在想象中搜索最优动作序列，实现前瞻性决策 |
| **环境生成器** | 生成训练环境，解决数据稀缺问题（如 Genie 生成可玩 2D 世界） |
| **认知桥梁** | 从感知决策走向认知推理的关键一步，让机器理解"世界如何运作" |

---

## 二、技术路线：四条主流路径

### 2.1 总览

```
                    World Model 技术路线
                         │
        ┌────────┬───────┼───────┬────────┐
        ▼        ▼       ▼       ▼        ▼
    Latent    JEPA    Diffusion  自回归    物理
    Dynamics  表征预测  扩散模型   序列建模  感知模型
        │        │       │       │        │
    DreamerV3  V-JEPA  DIAMOND  Sora     SymSim
                I-JEPA  UniSim   Genie
```

### 2.2 路线一：Latent Dynamics Model（潜在动力学模型）

**核心思想**：在压缩的潜在空间（latent space）中建模状态的动态转移。

- 编码器将观测映射到低维潜在状态 $z_t$
- 转移模型预测 $z_{t+1} = f(z_t, a_t)$
- 奖励模型预测 $r_t = g(z_t)$
- 策略在潜在空间中训练，不需要像素级重建

**代表工作**：Dreamer 系列（DreamerV1/V2/V3）

**优势**：
- 计算效率高（潜在空间维度远低于像素空间）
- 训练稳定，经验证在多种 benchmark 上有效

**劣势**：
- 信息瓶颈：压缩可能丢失关键细节
- 表征学习质量决定上限

### 2.3 路线二：Joint-Embedding Predictive Architecture（JEPA，表征预测）

**核心思想**（LeCun 提出）：**在表征空间而非像素空间做预测**，避免生成模型重建像素的浪费。

- 两个编码器分别处理 context 和 target（非对称架构）
- 预测目标：$\hat{z}_{future} = f(z_{context})$，其中 $z$ 是表征而非像素
- 不需要重建输入，只学抽象的"世界知识"

**代表工作**：I-JEPA（2023）、V-JEPA（2024）、V-JEPA 2.0（2025）

**优势**：
- 避免了生成模型的"重建偏差"（generative gap）
- 不浪费模型容量在无关细节（如精确纹理）上
- 更好地捕捉抽象因果关系

**劣势**：
- 表征质量难以评估（没有像素级 ground truth 可以比较）
- 当前在机器人控制任务上的验证尚不充分

### 2.4 路线三：Diffusion World Model（扩散世界模型）

**核心思想**：用扩散模型（Diffusion Model）作为 world model，生成像素级的未来状态预测。

- 条件扩散模型：给定当前观测和动作，去噪生成未来画面
- 生成质量高，物理细节丰富

**代表工作**：DIAMOND（2024）、UniSim（2023）

**优势**：
- 生成保真度高，物理细节（光影、纹理）保留好
- 可以直接在像素空间做想象 rollout，无需训练解码器

**劣势**：
- **推理速度慢**——扩散模型需要多步去噪，难以满足机器人实时控制频率（10-50Hz）
- 仍然存在"画"出合理但不物理正确的画面的问题

### 2.5 路线四：Autoregressive Video Model（自回归视频模型）

**核心思想**：将视频当作 token 序列，用自回归方式逐帧预测。

- 视频分 patch → tokenize → 自回归生成（类似 GPT 生成文本）
- 可以是"视频生成模型"，也被视为隐式的世界模拟器

**代表工作**：Sora（OpenAI, 2024）、Genie / Genie 2（DeepMind, 2023/2024）

**优势**：
- 架构统一（和 LLM 相同的 Transformer + 自回归范式），可利用 scaling 优势
- 生成长序列能力强
- Genie 证明可以从无标注视频中自动学习动作表征

**劣势**：
- **误差累积严重**——自回归生成的错误会逐步放大，长序列质量退化快
- 推理速度随序列长度线性增长
- Sora 式的纯视频生成不是真正的交互式世界模型（没有动作条件）

### 2.6 路线五：Physics-Informed Neural World Model（物理感知神经世界模型）

**核心思想**：将物理方程/约束嵌入神经网络中，保证预测满足物理规律。

- 在损失函数中加入物理约束（如能量守恒、碰撞约束）
- 或使用可微分物理引擎作为网络组件

**代表方向**：Neural-Symbolic Hybrid Models

**优势**：
- 物理一致性更好，不会"幻想"出违反物理的画面
- 样本效率更高（物理先验减少了需要学习的数据量）

**劣势**：
- 建模复杂开放场景受限（难以写出所有物理约束）
- 与大规模数据驱动方法的融合仍在探索中

### 2.7 路线对比

| 维度 | Latent Dynamics | JEPA | Diffusion | 自回归 | 物理感知 |
|------|:-:|:-:|:-:|:-:|:-:|
| **计算效率** | 高 | 高 | 低 | 中 | 中 |
| **生成质量** | 低（潜在空间） | 中（表征空间） | 高 | 高 | 中-高 |
| **物理一致性** | 低 | 中 | 中 | 低 | 高 |
| **长时序能力** | 中（有专门优化） | 中 | 低 | 低 | 中 |
| **成熟度** | 高（DreamerV3） | 中（V-JEPA 2.0） | 低-中 | 中 | 低 |
| **适合场景** | Model-based RL | 表征学习 | 视觉丰富场景 | 视频生成/环境 | 结构化场景 |

---

## 三、三阶段演进

World Model 在具身智能中的应用正在经历三个阶段的演进：

### Stage 1：视频预测模型（2022-2023）

- **目标**：给定当前画面（+动作），预测未来视频帧
- **代表**：GAIA-1 (Waymo)、Sora (OpenAI)
- **特征**：只是"看"的模拟，没有交互性
- **局限**：物理一致性不足，不能用于训练策略

### Stage 2：交互式世界模型（2023-2024）

- **目标**：在潜在空间中建模动态，支持动作条件下的状态转移预测
- **代表**：DreamerV3、Genie、UniSim
- **特征**：支持条件生成，可用于 model-based RL
- **局限**：长时序误差累积，模拟精度有限

### Stage 3：自主规划型世界模型（2024-未来）

- **目标**：World Model + LLM 混合架构，实现复杂长程任务的自主规划
- **代表方向**：Google DeepMind 通用机器人 world model、清华 RoboWorld
- **核心架构**：
  ```
  LLM/VLM（推理引擎）          World Model（想象力引擎）
      │                              │
      │   "把杯子拿起来"              │   想象：手臂抬起 →
      │   → 拆解为子任务             │   杯子被抓取 →
      │   → 推断中间状态             │   水可能洒出
      │                              │
      +------------ 协同 ------------+
  ```

---

## 四、里程碑工作详解

### 4.1 DreamerV3（2023.01）

**论文**：*Mastering Diverse Domains Through World Models* — Dan Hafner et al.
**链接**：https://arxiv.org/abs/2301.04104

**核心贡献**：
- **首个单一超参数配置**在 Atari 100k、DMLab、Minecraft 等多领域达到人类水平的 world model 算法
- 验证了 latent dynamics model-based RL 的通用性

**技术要点**：
- 在潜在空间中学习世界模型（recurrent state-space model, RSSM）
- 用想象 rollout 训练 actor-critic 策略
- 关键创新：对称 KL 正则化，使模型在不同规模的任务上保持稳定

**意义**：Model-based RL 领域的标杆工作，证明世界模型路线的可行性。

---

### 4.2 I-JEPA（2023.01）

**论文**：*Self-Supervised Learning from Images with a Joint-Embedding Predictive Architecture* — Yann LeCun et al. (Meta)
**链接**：https://arxiv.org/abs/2301.08243

**核心贡献**：
- 提出"在表征空间而非像素空间做预测"的核心范式
- 论证了这比生成式模型（MAE、扩散模型等）更适合学习抽象世界知识

**技术要点**：
- 两个独立的编码器分别编码 context block 和 target block
- 预测目标：用 context 的表征预测 target 的表征
- 使用 VICReg 风格的 non-contrastive objective 防止表征坍缩

**意义**：LeCun 对"什么是正确的世界模型学习范式"的回答，影响了后续整个研究方向。

---

### 4.3 UniSim（2023.05）

**论文**：*Learning Interactive Real-World Simulators* — Google Research
**链接**：https://arxiv.org/abs/2305.12920

**核心贡献**：
- **统一生成和仿真**——同一框架既做视频生成，又做条件模拟
- 从真实交互数据中学习可交互模拟器，支持机器人操控和导航任务的想象 rollout

**技术要点**：
- 扩散模型架构
- 统一处理真实数据和仿真数据
- 支持动作条件生成：给定当前观测 + 动作 → 预测下一帧

**意义**："世界模型用于机器人"的关键早期工作，证明了真实数据驱动的世界模型对机器人任务的迁移效果。

---

### 4.4 Genie（2023.12）

**论文**：*Genie: Generative Interactive Environments* — DeepMind
**链接**：https://arxiv.org/abs/2312.11435

**核心贡献**：
- 从 **20 万小时无标注视频**中自动学到动作表征
- 生成可交互的 2D 环境，开创了"无监督动作建模"范式

**技术要点**：
- 三个组件：视频 VAE（帧压缩）、动态模型（帧间转换）、潜在动作模型（从视频中提取隐动作）
- 不需要知道视频中的人在按什么键，模型自己学
- 生成的环境可以用学到的隐动作控制

**意义**：展示了从纯视频数据中同时学习世界模型和动作表征的可能性。

---

### 4.5 V-JEPA（2024.01）

**论文**：*Video Joint-Embedding Predictive Architecture* — Meta
**链接**：https://arxiv.org/abs/2401.13841

**核心贡献**：
- 将 JEPA 从图像扩展到视频
- 证明不做像素重建也能学到强视觉世界模型

**技术要点**：
- 视频输入 → 编码为表征 → 在表征空间预测未来帧的表征
- 不需要生成像素，避免了扩散模型/自回归模型的高计算开销
- 在动作识别、视频理解 benchmark 上与有监督方法竞争力相当

---

### 4.6 Sora（2024.02）

**论文**：*Video Generation Models as World Simulators* — OpenAI
**链接**：https://arxiv.org/abs/2402.17177

**核心贡献**：
- 首次正式提出 **"视频生成模型即世界模拟器"** 的论断
- 展示了大规模视频模型涌现出的物理理解能力

**技术要点**：
- DiT（Diffusion Transformer）架构，将视频处理为时空 patch
- 扩大规模后涌现出 3D 一致性、长时序连贯性、物体永久性等能力
- 可以模拟 Minecraft 等数字环境

**争议**：
- 社区对"到底算不算真正的世界模型"存在分歧
- 生成的视频经常违反物理（穿模、反重力）
- 不支持动作条件输入，不能用于训练策略
- 本质上更像强大的视频生成器，而非交互式世界模型

**意义**：引爆了整个 AI 社区对 world model 的讨论和关注，将这个概念从小众 RL 领域带入主流视野。

---

### 4.7 DIAMOND（2024）

**论文**：*DIAMOND: Diffusion World Model for Model-Based RL* — UCL
**方向**：在 Minecraft 上用扩散模型做 world model

**核心贡献**：
- 首次用扩散模型作为 world model 做 model-based RL，取得优异成绩
- 开辟了"扩散世界模型"这条新路线

**技术要点**：
- 扩散模型替代传统的 latent dynamics model
- 在想象 rollout 中生成像素级未来帧
- 策略在这些生成的帧上训练

**意义**：验证了扩散模型作为 world model 的可行性，但实时性挑战明显。

---

### 4.8 Genie 2（2024.12）

**论文**：*Genie 2: A Large-Scale Foundation World Model* — DeepMind
**链接**：https://arxiv.org/abs/2412.06214

**核心贡献**：
- 从**单张图片**生成多样化的可交互 2D 环境
- 大规模基础世界模型（Foundation World Model）的概念验证

**意义**：朝"世界模型即训练场"迈进一步——未来可以用 Genie 2 生成无限多样的训练环境来训练 embodied agent。

---

### 4.9 V-JEPA 2.0（2025.01）

**论文**：Meta
**链接**：https://arxiv.org/abs/2501.06814

**核心贡献**：
- 将 JEPA 范式推向更长时序和更复杂的具身推理任务
- Meta 在 world model 路线上的持续深耕

---

### 4.10 里程碑时间线

```
2023.01  I-JEPA          LeCun 提出表征预测范式
   │
2023.01  DreamerV3       首个跨领域 human-level 的 world model RL
   │
2023.05  UniSim          统一生成与仿真，真实数据驱动的机器人 world model
   │
2023.12  Genie           无标注视频 → 可交互 2D 环境
   │
2024.01  V-JEPA          JEPA 扩展到视频，表征预测验证
   │
2024.02  Sora            "视频生成即世界模拟器"，引爆讨论
   │
2024.??  DIAMOND         扩散模型做 world model，新路线验证
   │
2024.11  π₀ (Physical Intelligence)  流匹配通用机器人策略
   │
2024.12  Genie 2         基础世界模型，单图生成可交互环境
   │
2025.01  V-JEPA 2.0      长时序具身推理
   │
2025     Dreamer-Long    解决长时序误差累积
         Hierarchical WM 分层世界模型
         SimWorld Workshop (ICRA 2025)  学术界聚焦
```

---

## 五、当前面临的核心挑战

### 5.1 长时序误差累积（Compound Error）

这是 model-based RL 的**根本性瓶颈**。World Model 想象 10 步还可以，想象 100 步就崩溃——预测误差随步数指数级放大。

**2025 年的应对方案**：
- **分层世界模型**（Hierarchical WM）：高层做抽象长期规划，低层做短程精确预测
  - 参考：[Hierarchical World Models for Compositional Long-Horizon Robot Planning](https://arxiv.org/abs/2505.00102)
- **周期性接地**（Periodic Grounding）：定期用真实观测修正想象状态
- **Dreamer-Long**：循环状态重置 + 时域感知训练
  - 参考：[Dreamer-Long: Scaling World Models to Long-Horizon Robotic Control](https://arxiv.org/abs/2504.01123)

### 5.2 物理一致性

视频模型经常"画"出违反物理的画面——物体穿模、反重力、形变异常。

**根本原因**：模型是统计模式匹配，不是物理引擎。它学会了"水看起来是什么样的"，但没有学会"水遵循流体力学方程"。

**解决方向**：
- 将物理方程嵌入可微分计算图
- 物理先验 + 数据驱动的混合方法
- 用物理仿真数据做对抗训练

### 5.3 Sim-to-Real Gap

仿真环境里表现好 ≠ 真实世界能用。摩擦力、材质形变、光照变化、传感器噪声等细节在仿真和现实中差异巨大。

**2025 年的进展**：
- [Bridging the Sim-to-Real Gap for Long-Horizon Manipulation with World Models](https://arxiv.org/abs/2502.01868)
- [RoboCasa](https://arxiv.org/abs/2503.14210)：专门为长时序家庭任务设计的大规模仿真框架

### 5.4 实时推理效率

机器人控制频率要求 10-50Hz，但扩散模型需要多步去噪，推理速度跟不上。

**解决方向**：
- 蒸馏：用扩散模型生成训练数据，蒸馏成更快的自回归或 latent model
- 潜在空间操作：不在像素空间做扩散，在低维潜在空间做
- 专用芯片加速

### 5.5 数据瓶颈

Scaling laws 研究表明，没有物理真实数据的支撑，单纯扩大模型收益递减。互联网视频虽然丰富，但缺乏动作标注和物理交互信息。

---

## 六、未来发展方向

### 6.1 World Model + LLM 混合架构（最被看好的方向）

```
┌─────────────────────────────────────────────────┐
│                  混合架构                         │
│                                                   │
│  ┌─────────────┐      ┌─────────────────────┐    │
│  │ LLM/VLM     │      │ World Model          │    │
│  │ (推理引擎)   │◄────►│ (想象力引擎)         │    │
│  │             │      │                     │    │
│  │ · 任务分解   │      │ · 环境模拟          │    │
│  │ · 因果推理   │      │ · 动作评估          │    │
│  │ · 高层规划   │      │ · 状态预测          │    │
│  └─────────────┘      └─────────────────────┘    │
│         │                       │                │
│         └───────────┬───────────┘                │
│                     ▼                            │
│              策略网络（Policy）                    │
│              输出：机器人动作                       │
└─────────────────────────────────────────────────┘
```

- **LLM 负责**：高层规划、因果推理、任务分解、常识判断
- **World Model 负责**：环境模拟、低层预测、动作后果评估
- 两者协同才能处理需要**长期推理 + 物理交互**的复杂任务

### 6.2 分层世界模型（Hierarchical World Model）

解决长时序误差累积最有希望的方向：

| 层级 | 时间尺度 | 空间粒度 | 功能 |
|------|---------|---------|------|
| 高层 | 分钟级 | 语义级别 | "做完这一步，房间会变成什么样" |
| 中层 | 秒级 | 物体级别 | "杯子被移动到了桌子右侧" |
| 低层 | 100ms 级 | 像素/关节级别 | "接下来 1 秒的手指轨迹" |

高层做抽象规划，低层做精确预测。每一层只负责短时序预测，误差可控。

### 6.3 互联网视频大规模预训练 → 机器人迁移

类比 NLP 中"预训练 + 微调"的范式迁移到具身领域：

1. **预训练**：用互联网海量视频训练 world model（学习"世界如何运作"的通用知识）
2. **微调**：用机器人交互数据微调（学习"我的身体如何与世界交互"）

关键挑战：互联网视频缺乏动作标注和力觉信息。

### 6.4 多模态世界模型

当前的 world model 主要依赖视觉，但真正的具身智能需要：

| 模态 | 信息 | 当前状态 |
|------|------|---------|
| 视觉 | 物体位置、形状、颜色 | 成熟 |
| 触觉/力觉 | 抓取力度、材质硬度 | 早期 |
| 本体感觉 | 关节角度、身体姿态 | 中期 |
| 听觉 | 碰撞声音、环境反馈 | 早期 |

多模态融合才能建立完整的世界模型。

### 6.5 评测体系的建设

当前缺乏统一、可信的 world model 评测标准。社区正在推动：
- 物理一致性评测（如物体碰撞、重力、流体）
- 长时序连贯性评测
- 机器人任务 transfer 效果评测
- ICRA 2025 SimWorld Workshop 等会议专门讨论此问题

---

## 七、产业进展与落地时间线

### 7.1 主要玩家

| 公司/机构 | 方向 | 状态 |
|----------|------|------|
| Google DeepMind | 通用机器人 world model | 研究领先，demo 阶段 |
| Meta / LeCun | JEPA 路线，表征预测 | V-JEPA 2.0 持续迭代 |
| OpenAI | Sora（视频世界模型） | 视频生成能力强，但非交互式 |
| NVIDIA | Isaac Sim + 物理 world model | 工具链成熟，合成数据生成领先 |
| Tesla | 端到端神经网络驾驶 | 已上车，更接近行为克隆而非显式 world model |
| Physical Intelligence | π₀（通用机器人策略） | VLA 模型加速落地 |
| Figure / 1X | 通用人形机器人 | 大模型 + world model 结合 |
| 清华 / 智源 | RoboWorld 等框架 | 学术界有突破性工作 |

### 7.2 预期落地时间线

| 时间 | 预期 |
|------|------|
| 2025-2026 | 受控场景（工厂、仓库）中，world model 辅助的机器人策略开始商用 |
| 2026-2028 | 家庭场景中的简单任务（整理、搬运），world model + LLM 混合架构成熟 |
| 2028+ | 通用家庭服务机器人，具备复杂长程任务能力 |

---

## 八、总结

| 问题 | 判断 |
|------|------|
| World Model 是不是正确的方向？ | 是，业界共识度很高，但具体形态还在演进 |
| 当前最大的瓶颈是什么？ | 长时序误差累积 + 物理一致性 + Sim-to-Real Gap，三者互相耦合 |
| 最终形态是什么？ | 大概率是**分层混合架构**：LLM 做推理，分层 world model 做模拟，物理引擎做兜底 |
| 距离真实机器人可靠运行还有多远？ | 受控场景 3-5 年，家庭场景 5-8 年 |
| 对从业者意味着什么？ | 这是通向通用具身智能最被看好的路线之一，但也最难，需要跨领域知识（RL、生成模型、机器人学、物理仿真） |

### 推荐学习路径

```
I-JEPA    理解"为什么不在像素空间预测"
  ↓
DreamerV3 理解 model-based RL 的完整流程
  ↓
UniSim    理解"真实数据 → 世界模型 → 机器人"
  ↓
DIAMOND   理解扩散模型作为 world model
  ↓
Genie/Genie 2  理解环境生成
  ↓
π₀ / RT-X 理解通用机器人策略
```

### 参考文献

1. DreamerV3: https://arxiv.org/abs/2301.04104
2. I-JEPA: https://arxiv.org/abs/2301.08243
3. V-JEPA: https://arxiv.org/abs/2401.13841
4. V-JEPA 2.0: https://arxiv.org/abs/2501.06814
5. Sora: https://arxiv.org/abs/2402.17177
6. UniSim: https://arxiv.org/abs/2305.12920
7. Genie: https://arxiv.org/abs/2312.11435
8. Genie 2: https://arxiv.org/abs/2412.06214
9. π₀: https://arxiv.org/abs/2410.24165
10. World Models for Embodied AI Survey: https://arxiv.org/abs/2409.11236
11. Dreamer-Long: https://arxiv.org/abs/2504.01123
12. Hierarchical World Models: https://arxiv.org/abs/2505.00102
13. Bridging Sim-to-Real Gap: https://arxiv.org/abs/2502.01868
14. RoboCasa: https://arxiv.org/abs/2503.14210
