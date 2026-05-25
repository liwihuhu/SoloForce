// ============================================
// LLM 适配器 - 输入适配器实现
// 支持 SiliconFlow (OpenAI 兼容格式)
// ============================================

import type { 
  InputAdapter, 
  NegotiationRequest, 
  NegotiationResponse, 
  ToolCall, 
  ToolResult,
  Speaker,
  SummaryResult
} from './types';

/**
 * 角色性格配置 - 各行各业
 */
const ROLE_PERSONALITIES: Record<string, string> = {
  // 企业管理
  manager: '你务实、有全局观，善于协调资源和推进决策。发言简洁有力，关注团队整体目标。',
  ceo: '你具有战略眼光，善于把握大局和长远规划。决策果断，关注企业愿景和使命。',
  hr: '你关注人才发展，善于沟通和协调人际关系。重视团队文化建设。',
  finance: '你严谨务实，注重成本效益和风险管理。数字敏感，善于财务分析。',
  accountant: '你注重细节，准确严谨，熟悉财务规范。说话实事求是。',
  admin: '你注重效率和组织协调，熟悉流程管理。善于资源调配。',
  // 科技
  developer: '你逻辑严谨、注重技术可行性，擅长从技术角度分析问题。说话直接，喜欢用数据说话。',
  designer: '你创意十足、关注用户体验，善于从用户角度思考问题。发言富有想象力。',
  analyst: '你数据驱动、善于分析，习惯用数据支撑观点。说话条理清晰、严谨。',
  qa: '你注重质量、善于发现问题，习惯从风险角度思考。说话严谨。',
  devops: '你关注稳定性、注重效率，善于从系统角度思考问题。',
  architect: '你技术视野广阔，善于架构设计。关注可扩展性和长期维护。',
  pm: '你关注产品价值和用户需求，协调技术和业务。善于平衡取舍。',
  // 创意
  writer: '你表达能力强、善于总结提炼，关注内容的准确性和可读性。',
  artist: '你创意十足、审美敏锐，善于从美学角度思考问题。想法独特新颖。',
  musician: '你对节奏和情感敏感，善于用音乐表达思想。思维跳跃但有逻辑。',
  photographer: '你善于捕捉瞬间和美感，关注光影和构图。观察细致入微。',
  director: '你善于统筹全局，关注整体效果和节奏把控。表达清晰有感染力。',
  actor: '你善于表达情感，理解人性。观察敏锐，善于共情。',
  // 专业服务
  lawyer: '你逻辑严密、注重证据和条文，说话严谨。善于从法律角度分析问题。',
  consultant: '你经验丰富、视野开阔，善于诊断问题和提供解决方案。表达清晰。',
  advisor: '你专业可靠，善于财务规划和建议。说话严谨有据。',
  agent: '你善于沟通协调，关注客户需求。处理事务灵活高效。',
  // 教育研究
  teacher: '你耐心细致，善于讲解和引导。关注学习者的特点和需求。',
  researcher: '你深入钻研、追求本质，喜欢从原理层面分析问题。严谨认真。',
  scientist: '你科学严谨、注重实验证据，善于从数据中发现规律。逻辑性强。',
  professor: '你学识渊博，善于理论联系实际。讲解深入浅出。',
  coach: '你善于启发和引导，关注学员成长。语言有感染力。',
  // 医疗健康
  doctor: '你专业严谨、经验丰富，关注患者健康。说话明确，讲究证据。',
  nurse: '你富有同理心，关注患者感受和护理细节。善于沟通和倾听。',
  pharmacist: '你熟悉药理知识，关注用药安全。说话专业严谨。',
  psychologist: '你善于倾听和共情，理解人心。说话温和但有洞察力。',
  nutritionist: '你关注健康饮食，善于营养搭配。说话专业有据。',
  // 金融
  investor: '你关注价值增长和风险控制，善于评估投资机会。决策理性。',
  banker: '你熟悉金融市场，注重风险和收益的平衡。说话专业严谨。',
  broker: '你反应灵敏，善于捕捉市场机会。沟通能力强的。',
  analyst_f: '你数据敏感，擅长财务建模和分析。逻辑严密。',
  risk_manager: '你注重风险识别和控制，说话谨慎。善于预防潜在问题。',
  accountant_f: '你专业精准，熟悉会计准则。数字敏感，做事严谨。',
  actuary: '你擅长风险评估和精算数理，逻辑严密的。',
  tax: '你精通税法，善于税务筹划。说话专业严谨。',
  // 营销传媒
  marketer: '你创意十足、关注市场趋势，善于洞察用户需求。表达有感染力。',
  copywriter: '你文字功底扎实，善于用语言打动人心。洞察用户心理。',
  media_buyer: '你熟悉媒介渠道，善于精准投放。关注投入产出比。',
  social_media: '你熟悉社交媒体运营，善于打造爆款内容。网感敏锐。',
  brand_manager: '你注重品牌建设，善于品牌策略和形象管理。战略思维强。',
  pr: '你擅长公共关系维护，善于危机公关和媒体沟通。语言表达能力强。',
  event_planner: '你善于统筹大型活动，关注细节和整体效果。协调能力强。',
  influencer: '你了解网红经济，善于内容创作和粉丝运营。有个人魅力。',
  // 生活服务
  chef: '你追求美味和创新，关注食材和烹饪技巧。善于从美食角度思考。',
  journalist: '你追求真相、善于调查，说话简洁有力。关注社会影响。',
  lawyer_l: '你逻辑严密、注重证据，说话严谨。善于从法律角度分析。',
  broker_h: '你熟悉房产市场，善于沟通协调。关注客户需求。',
  agent_i: '你善于沟通，理解客户需求。服务意识强。',
  driver: '你经验丰富，熟悉路况。说话实在，注重安全。',
  // 其他
  custom: '你是一个多面手，能够适应不同情况。',
};

/**
 * 备用发言（LLM 调用失败时使用）
 */
const FALLBACK_OPINIONS = [
  '我认为需要综合考虑各方面因素，制定一个可行的方案。',
  '从我的专业角度，这个方向是可行的，建议先做一个小规模试点。',
  '需要更多数据支撑决策，建议先收集相关指标。',
  '我认为这个方案的核心优势在于...',
  '建议结合实际情况调整方案细节。',
];

export interface LLMAdapterConfig {
  baseUrl: string;       // LLM API Base URL (e.g., https://api.siliconflow.cn/v1)
  apiKey: string;         // API Key
  model: string;          // 模型名称 (e.g., Qwen/Qwen2.5-7B-Instruct)
  maxTokens?: number;     // 最大 token 数
  temperature?: number;   // 温度参数
}

export class LLMAdapter implements InputAdapter {
  private config: LLMAdapterConfig;

  constructor(config: LLMAdapterConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.siliconflow.cn/v1',
      apiKey: config.apiKey,
      model: config.model || 'Qwen/Qwen2.5-7B-Instruct',
      maxTokens: config.maxTokens || 500,
      temperature: config.temperature ?? 0.7,
    };
  }

  /**
   * 发送协商请求到 LLM
   */
  async sendNegotiationRequest(request: NegotiationRequest): Promise<NegotiationResponse> {
    const { speaker, topic, blackboard, userPriorityContent } = request;

    // 构建消息
    const messages = this.buildMessages(speaker, topic, blackboard, userPriorityContent);

    console.log(`[LLMAdapter] Calling ${speaker.name} (role: ${speaker.role})`);
    console.log(`[LLMAdapter] Model: ${this.config.model}, Messages: ${messages.length}`);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLMAdapter] API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          content: '',
          error: `LLM API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();
      const outputText = this.extractOutputText(data);
      console.log(`[LLMAdapter] Response: ${outputText?.slice(0, 50) || 'NULL'}...`);

      return {
        success: true,
        content: outputText || FALLBACK_OPINIONS[Math.floor(Math.random() * FALLBACK_OPINIONS.length)],
        toolCalls: undefined, // 暂不支持工具调用
      };
    } catch (error) {
      console.error('[LLMAdapter] Request failed:', error);
      return {
        success: false,
        content: FALLBACK_OPINIONS[Math.floor(Math.random() * FALLBACK_OPINIONS.length)],
        error: String(error),
      };
    }
  }

  /**
   * 执行工具调用（暂不支持，返回错误）
   */
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      success: false,
      output: '',
      error: '工具调用暂不支持，当前版本仅支持纯对话模式',
    };
  }

  /**
   * 生成会议总结
   */
  async sendSummaryRequest(
    topic: string,
    blackboard: { authorName: string; authorType: string; type: string; content: string; toolName?: string }[],
    participants: { name: string; role: string; roleName: string }[]
  ): Promise<SummaryResult> {
    const prompt = this.buildSummaryPrompt(topic, blackboard, participants);

    console.log('[LLMAdapter] Generating meeting summary...');

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: `你是一个严格的 JSON 生成器。给定会议记录，你必须输出一个且仅一个有效的 JSON 对象，不要输出任何其他文字。

示例输出：
{
  "summary": "本次会议讨论了项目技术选型，张经理建议使用Spring Boot，陈开发认为React更合适，最终决定采用前后端分离架构。",
  "decisions": ["采用前后端分离架构", "后端使用Spring Boot", "前端使用React"],
  "keyPoints": ["张经理强调开发效率", "陈开发关注前端性能", "成本控制是重要考量"],
  "unresolved": ["数据库选型未最终确定"],
  "actionItems": [{"task": "评估数据库方案", "owner": "陈开发", "deadline": "本周五"}]
}

重要规则：
1. 只输出 JSON，不要任何前缀文字如"以下是JSON："
2. summary 字段不超过100字
3. 所有数组字段如果没有内容就写 []
4. actionItems 的每个元素要有 task 字段，owner 和 deadline 可选`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLMAdapter] Summary API error: ${response.status} - ${errorText}`);
        return this.getDefaultSummaryResult(topic);
      }

      const data = await response.json();
      const outputText = this.extractOutputText(data);
      
      if (!outputText) {
        return this.getDefaultSummaryResult(topic);
      }

      // 清理并解析 JSON
      try {
        // 去除 markdown 代码块标记
        let jsonStr = outputText.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        jsonStr = jsonStr.trim();
        
        // 尝试修复常见的 JSON 错误
        jsonStr = this.fixMalformedJSON(jsonStr);
        
        const parsed = JSON.parse(jsonStr);

        return {
          topic,
          summary: parsed.summary || '会议已结束',
          decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
          unresolved: Array.isArray(parsed.unresolved) ? parsed.unresolved : [],
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        };
      } catch (parseError) {
        console.error('[LLMAdapter] Failed to parse summary JSON:', parseError);
        console.error('[LLMAdapter] Raw output:', outputText);
        // 降级：从原始文本中提取总结内容
        return this.extractSummaryFromText(outputText, topic);
      }
    } catch (error) {
      console.error('[LLMAdapter] Summary request failed:', error);
      return this.getDefaultSummaryResult(topic);
    }
  }

  /**
   * 构建会议总结的 Prompt
   */
  private buildSummaryPrompt(
    topic: string,
    blackboard: { authorName: string; authorType: string; type: string; content: string; toolName?: string }[],
    participants: { name: string; role: string; roleName: string }[]
  ): string {
    const opinions = blackboard
      .filter(b => b.type === 'opinion')
      .map(b => `- 【${b.authorName}】${b.content}`)
      .join('\n');

    const questions = blackboard
      .filter(b => b.type === 'question')
      .map(b => `- 【${b.authorName}提问】${b.content}`)
      .join('\n');

    const decisions = blackboard
      .filter(b => b.type === 'decision')
      .map(b => `- 【${b.authorName}决策】${b.content}`)
      .join('\n');

    const toolResults = blackboard
      .filter(b => b.type === 'tool_result')
      .map(b => `- 【${b.authorName}】${b.toolName || '工具'}: ${b.content}`)
      .join('\n');

    const participantsList = participants
      .map(p => `- ${p.name}（${p.roleName}）`)
      .join('\n');

    return `## 会议信息
- 议题：${topic}
- 参与人员：\n${participantsList}

## 会议讨论内容\n${opinions || '（无）'}\n
## 提出的问题\n${questions || '（无）'}\n
## 已有的决策\n${decisions || '（无）'}\n
## 工具执行结果\n${toolResults || '（无）'}\n
## 输出要求
请根据以上内容生成会议总结，必须严格遵循以下 JSON 格式：

{
  "summary": "会议概要（100字内）",
  "decisions": ["决议事项1", "决议事项2"],
  "keyPoints": ["关键观点1", "关键观点2"],
  "unresolved": ["未解决的分歧1", "未解决的分歧2"],
  "actionItems": [
    {"task": "待办事项", "owner": "负责人（如果能推断）", "deadline": "期限（如果能推断）"}
  ]
}

如果某项为空，请返回空数组 []。不要返回除 JSON 外的任何其他内容。`;
  }

  /**
   * 修复常见的 JSON 格式错误
   */
  private fixMalformedJSON(jsonStr: string): string {
    try {
      JSON.parse(jsonStr); // 如果本身就正确，直接返回
      return jsonStr;
    } catch {
      // JSON 解析失败，尝试修复
    }
    
    // 修复 1: 修复 aItems -> actionItems
    jsonStr = jsonStr.replace(/"aItems"/g, '"actionItems"');
    
    // 修复 2: 修复数组元素中多余的引号（如 " "task": 变成 "task":）
    // 匹配类似 " "key": value" 的模式
    jsonStr = jsonStr.replace(/"\s+"([a-zA-Z_]+)"\s*:/g, '"$1":');
    
    // 修复 3: 移除数组元素末尾多余的逗号和引号
    // 如 ["item",
    // "]  -> ["item"]
    jsonStr = jsonStr.replace(/,\s*"]/g, ']');
    
    // 修复 4: 修复字段值中多余的双引号
    // 如 "unresolved": "框架B的长期规划未最终确定",  -> 应该是字符串
    // 匹配没有被正确闭合的字符串字段
    
    // 修复 5: 移除 trailing comma
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
    
    // 修复 6: 尝试提取有效的 JSON 对象
    // 查找第一个 { 和最后一个 }
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      jsonStr = jsonStr.substring(start, end + 1);
    }
    
    // 修复 7: 确保所有字符串值被正确引号包裹
    // 移除值内部多余的引号
    jsonStr = jsonStr.replace(/"([^"]+)"\s*,\s*"([^"]+)"\s*:/g, '"$1", "$2":');
    
    return jsonStr;
  }

  /**
   * 从非结构化文本中提取会议总结
   */
  private extractSummaryFromText(text: string, topic: string): SummaryResult {
    const result: SummaryResult = {
      topic,
      summary: '',
      decisions: [],
      keyPoints: [],
      unresolved: [],
      actionItems: [],
    };

    if (!text) {
      return this.getDefaultSummaryResult(topic);
    }

    // 清理文本
    let cleanText = text.trim();
    // 移除 markdown 代码块标记
    cleanText = cleanText.replace(/```(?:json)?\s*/g, '').trim();
    
    // 尝试提取 summary 字段（兼容带引号和不带引号）
    const summaryMatch = cleanText.match(/"summary"\s*:\s*"?([^"}]+)"?/i) ||
                          cleanText.match(/summary[：:]\s*([^\n\r]+)/i);
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim().slice(0, 200);
    }

    // 尝试提取 decisions
    const decisionsMatch = cleanText.match(/"decisions"\s*:\s*(\[[^\]]+\])/i);
    if (decisionsMatch) {
      try {
        const parsed = JSON.parse(decisionsMatch[1]);
        if (Array.isArray(parsed)) {
          result.decisions = parsed.map(String).slice(0, 10);
        }
      } catch {
        // 尝试从文本中提取
        const items = cleanText.match(/[决策决定决议]\s*(\d+[.、]\s*)?([^\n\r]+)/gi);
        if (items) {
          result.decisions = items.map(s => s.replace(/^[决策决定决议]\s*\d+[.、]\s*/i, '').trim()).filter(Boolean);
        }
      }
    }

    // 尝试提取 keyPoints
    const keyPointsMatch = cleanText.match(/"keyPoints"\s*:\s*(\[[^\]]+\])/i);
    if (keyPointsMatch) {
      try {
        const parsed = JSON.parse(keyPointsMatch[1]);
        if (Array.isArray(parsed)) {
          result.keyPoints = parsed.map(String).slice(0, 10);
        }
      } catch {
        // 从文本中提取包含"观点"、"认为"等关键词的句子
        const sentences = cleanText.split(/[。！？\n]/);
        result.keyPoints = sentences
          .filter(s => /[观点认为建议]/.test(s) && s.length > 5 && s.length < 100)
          .map(s => s.trim())
          .slice(0, 5);
      }
    }

    // 如果 summary 为空，尝试从全文提取
    if (!result.summary) {
      // 取第一段非 JSON 的文本作为 summary
      const lines = cleanText.split(/[\n\r]/).filter(l => l.trim() && !l.includes('"') && !l.includes(':'));
      if (lines.length > 0) {
        result.summary = lines[0].trim().slice(0, 200);
      }
    }

    // 如果仍然为空，使用默认
    if (!result.summary) {
      return this.getDefaultSummaryResult(topic);
    }

    console.log('[LLMAdapter] Extracted summary via fallback:', result.summary.slice(0, 50));
    return result;
  }

  /**
   * 获取默认总结结果
   */
  private getDefaultSummaryResult(topic: string): SummaryResult {
    return {
      topic,
      summary: '会议已结束，讨论内容已记录。',
      decisions: [],
      keyPoints: [],
      unresolved: [],
      actionItems: [],
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 构建消息列表
   */
  private buildMessages(
    speaker: Speaker,
    topic: string,
    blackboard: { authorName: string; authorType: string; type: string; content: string }[],
    userPriorityContent?: string
  ): Array<{ role: string; content: string }> {
    const { instruction, input } = this.buildPrompt(speaker, topic, blackboard, userPriorityContent);

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: instruction },
      { role: 'user', content: input },
    ];

    return messages;
  }

  /**
   * 构建 Prompt
   */
  private buildPrompt(
    speaker: Speaker,
    topic: string,
    blackboard: { authorName: string; authorType: string; type: string; content: string }[],
    userPriorityContent?: string
  ): { instruction: string; input: string } {
    // 获取已有观点
    const existingOpinions = blackboard
      .filter(item => item.type === 'opinion' || item.type === 'summary')
      .slice(-5)
      .map(item => `【${item.authorName}】：${item.content}`)
      .join('\n');

    const questions = blackboard
      .filter(item => item.type === 'question')
      .map(item => `【${item.authorName}提问】：${item.content}`)
      .join('\n');

    const pendingItems = blackboard
      .filter(item => item.type === 'pending')
      .map(item => `【待处理-${item.authorName}】：${item.content}`)
      .join('\n');

    const toolResults = blackboard
      .filter(item => item.type === 'tool_result')
      .map(item => `【${item.authorName}的工具结果】：${(item as any).toolName || item.authorType} -> ${item.content}`)
      .join('\n');

    const personality = ROLE_PERSONALITIES[speaker.role] || ROLE_PERSONALITIES.custom;
    const personalityStyle = this.getPersonalityStyle(speaker.personality);
    const expertise = speaker.expertise?.join('、') || '综合能力';

    // system: 角色设定
    const instruction = `${personality}

## 发言风格
${personalityStyle}

## 你的专长
${expertise}`;

    // user: 会议上下文
    let input = `## 会议议题
"${topic}"`;

    if (userPriorityContent) {
      input += `\n\n## ⚠️ 仲裁者指示
"${userPriorityContent}"`;
    }

    if (questions) {
      input += `\n\n## ❓ 仲裁者提出的问题
${questions}`;
    }

    if (existingOpinions) {
      input += `\n\n## 会议上已经讨论的内容
${existingOpinions}`;
    }

    if (toolResults) {
      input += `\n\n## 🔧 工具执行结果
${toolResults}`;
    }

    if (pendingItems) {
      input += `\n\n## ⏳ 待处理的事项
${pendingItems}`;
    }

    input += `\n\n## 发言要求
1. 结合你的专业背景提出见解
2. 发言口语化，像真实开会
3. 控制在150字以内
4. 直接输出发言内容，不要前缀`;

    return { instruction, input };
  }

  /**
   * 获取发言风格配置
   */
  private getPersonalityStyle(personality?: string): string {
    const styles: Record<string, string> = {
      balanced: '你稳重理性，发言客观中立。不偏不倚地分析利弊，帮助团队全面考虑问题。',
      challenger: '你善于质疑和挑战固有思维。当观点过于乐观或忽视风险时，你会提出不同意见。你的质疑是为了得出更好的方案，而不是反对一切。',
      supporter: '你积极支持好的想法，当团队提出可行方案时，你会补充细节使其更完善。你善于发现建议中的亮点并强化它。',
      cautious: '你谨慎稳重，重风险控制。在做决定前，你会反复确认：这个方案有什么风险？最坏情况是什么？应急预案是什么？',
      innovator: '你思维开放，喜欢突破常规。当讨论陷入僵局时，你会提出新思路：有没有更好的方式？这个问题可以用新技术解决吗？',
    };
    return styles[personality || 'balanced'] || styles.balanced;
  }

  /**
   * 从 LLM 响应中提取文本
   */
  private extractOutputText(data: any): string | null {
    try {
      // OpenAI 兼容格式
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      return null;
    } catch {
      return null;
    }
  }
}
