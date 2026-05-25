// ============================================
// OpenClaw 适配器 - 输入适配器实现
// 支持错误处理、重试机制、超时控制、详细日志
// ============================================

import type { 
  InputAdapter, 
  NegotiationRequest, 
  NegotiationResponse, 
  ToolCall, 
  ToolResult,
  Speaker
} from '../core/types';

/**
 * OpenClaw 适配器配置
 */
export interface OpenClawAdapterConfig {
  baseUrl: string;           // OpenClaw Gateway URL
  apiToken: string;         // API Token
  defaultAgentId: string;   // 默认 Agent ID
  agentMapping?: Record<string, string>;  // 角色 -> Agent ID 映射
  model?: string;
  timeout?: number;          // 请求超时(ms)，默认 30000
  retries?: number;         // 重试次数，默认 2
  retryDelay?: number;      // 重试间隔(ms)，默认 1000
}

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
 * 发言风格配置
 */
const PERSONALITY_STYLES: Record<string, string> = {
  balanced: '你稳重理性，发言客观中立。不偏不倚地分析利弊，帮助团队全面考虑问题。',
  challenger: '你善于质疑和挑战固有思维。当观点过于乐观或忽视风险时，你会提出不同意见。你的质疑是为了得出更好的方案，而不是反对一切。',
  supporter: '你积极支持好的想法，当团队提出可行方案时，你会补充细节使其更完善。你善于发现建议中的亮点并强化它。',
  cautious: '你谨慎稳重，重风险控制。在做决定前，你会反复确认：这个方案有什么风险？最坏情况是什么？应急预案是什么？',
  innovator: '你思维开放，喜欢突破常规。当讨论陷入僵局时，你会提出新思路：有没有更好的方式？这个问题可以用新技术解决吗？',
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
  '基于目前的信息，我倾向于支持这个方向，但需要进一步论证。',
  '这个问题需要更多方面的意见，建议下次会议深入讨论。',
  '从风险角度看，这个方案需要增加一些缓冲措施。',
];

/**
 * OpenClaw 适配器
 * 提供完善的错误处理、重试机制和详细日志
 */
export class OpenClawAdapter implements InputAdapter {
  private config: Required<OpenClawAdapterConfig>;
  private defaultTools: string[] = ['ddg-search', 'web-fetch'];

  constructor(config: OpenClawAdapterConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:18789',
      apiToken: config.apiToken,
      defaultAgentId: config.defaultAgentId || 'main',
      agentMapping: config.agentMapping || {},
      model: config.model || 'openclaw',
      timeout: config.timeout || 30000,      // 默认 30 秒
      retries: config.retries || 2,            // 默认重试 2 次
      retryDelay: config.retryDelay || 1000,  // 默认 1 秒间隔
    };
    
    console.log(`[OpenClawAdapter] Initialized with baseUrl: ${this.config.baseUrl}`);
    console.log(`[OpenClawAdapter] Config: timeout=${this.config.timeout}ms, retries=${this.config.retries}`);
  }

  /**
   * 发送协商请求到 OpenClaw（带重试机制）
   */
  async sendNegotiationRequest(request: NegotiationRequest): Promise<NegotiationResponse> {
    const { speaker, topic, blackboard, userPriorityContent } = request;
    const startTime = Date.now();

    // 构建 prompt
    const prompt = this.buildPrompt(speaker, topic, blackboard, userPriorityContent);
    
    console.log(`[OpenClawAdapter] >>> Request start`);
    console.log(`[OpenClawAdapter]     Speaker: ${speaker.name} (role: ${speaker.role})`);
    console.log(`[OpenClawAdapter]     Topic: ${topic.slice(0, 50)}...`);
    console.log(`[OpenClawAdapter]     Instructions length: ${prompt.instruction.length} chars`);
    console.log(`[OpenClawAdapter]     Input length: ${prompt.input.length} chars`);
    
    let lastError: string = '';
    
    // 重试循环
    for (let attempt = 1; attempt <= this.config.retries + 1; attempt++) {
      console.log(`[OpenClawAdapter]     Attempt ${attempt}/${this.config.retries + 1}`);
      
      try {
        const result = await this.executeRequest(prompt, speaker.name);
        const duration = Date.now() - startTime;
        
        console.log(`[OpenClawAdapter] <<< Request success in ${duration}ms`);
        console.log(`[OpenClawAdapter]     Response length: ${result.content.length} chars`);
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(`[OpenClawAdapter]     Attempt ${attempt} failed: ${lastError}`);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt <= this.config.retries) {
          console.log(`[OpenClawAdapter]     Waiting ${this.config.retryDelay}ms before retry...`);
          await this.delay(this.config.retryDelay);
        }
      }
    }
    
    // 所有重试都失败了
    const duration = Date.now() - startTime;
    console.error(`[OpenClawAdapter] <<< Request failed after ${this.config.retries + 1} attempts in ${duration}ms`);
    console.error(`[OpenClawAdapter]     Last error: ${lastError}`);
    
    return {
      success: false,
      content: FALLBACK_OPINIONS[Math.floor(Math.random() * FALLBACK_OPINIONS.length)],
      error: `Failed after ${this.config.retries + 1} attempts: ${lastError}`,
    };
  }

  /**
   * 执行单次请求
   */
  private async executeRequest(
    prompt: { instruction: string; input: string },
    speakerName: string
  ): Promise<NegotiationResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
          'x-openclaw-agent-id': this.config.defaultAgentId,
        },
        body: JSON.stringify({
          model: this.config.model,
          instructions: prompt.instruction,
          input: prompt.input,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error body');
        console.error(`[OpenClawAdapter]     HTTP ${response.status}: ${errorText.slice(0, 200)}`);
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      
      // 解析响应
      const outputText = this.extractOutputText(data);
      
      if (!outputText) {
        console.warn(`[OpenClawAdapter]     Warning: Empty response from OpenClaw`);
        console.warn(`[OpenClawAdapter]     Raw response: ${JSON.stringify(data).slice(0, 500)}`);
        throw new Error('Empty response from OpenClaw');
      }
      
      const toolCalls = this.extractToolCalls(data);

      return {
        success: true,
        content: outputText,
        toolCalls,
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.config.timeout}ms`);
        }
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * 执行工具调用
   */
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    console.log(`[OpenClawAdapter]     Executing tool: ${toolCall.name}`);
    console.log(`[OpenClawAdapter]     Arguments: ${JSON.stringify(toolCall.arguments).slice(0, 200)}`);
    
    // TODO: 实现工具执行逻辑
    // 这里需要根据工具类型调用不同的执行器
    // 例如：ddg-search -> 调用搜索 API
    //       dify-workflow -> 调用 Dify API
    
    // 目前返回模拟结果
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      success: true,
      output: `[模拟] 已执行 ${toolCall.name}，参数: ${JSON.stringify(toolCall.arguments)}`,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 获取角色对应的 Agent ID
   */
  private getAgentId(role: string): string {
    return this.config.agentMapping?.[role] || this.config.defaultAgentId;
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
    const personalityStyle = PERSONALITY_STYLES[speaker.personality || 'balanced'] || PERSONALITY_STYLES.balanced;
    const expertise = speaker.expertise?.join('、') || '综合能力';
    const tools = speaker.availableTools?.join('、') || this.defaultTools.join('、');

    // instructions: 角色设定
    const instruction = `${personality}

## 发言风格
${personalityStyle}

## 你的专长
${expertise}

## 可用工具
${tools}`;

    // input: 会议上下文（发给 LLM 的实际内容）
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
   * 从 OpenClaw 响应中提取文本（增强版，更健壮）
   */
  private extractOutputText(data: any): string | null {
    try {
      // 情况 1: data.output 是字符串
      if (typeof data.output === 'string') {
        return data.output.trim();
      }
      
      // 情况 2: data.output.text
      if (data.output?.text) {
        return String(data.output.text).trim();
      }
      
      // 情况 3: data.output.output_text
      if (data.output?.output_text) {
        return String(data.output.output_text).trim();
      }
      
      // 情况 4: data.response.output.text
      if (data.response?.output?.text) {
        return String(data.response.output.text).trim();
      }
      
      // 情况 5: 遍历 output 数组
      if (data.output && Array.isArray(data.output)) {
        for (const item of data.output) {
          // 情况 5a: message 类型
          if (item.type === 'message') {
            const content = item.content;
            
            if (typeof content === 'string') {
              return content.trim();
            }
            
            if (Array.isArray(content)) {
              for (const c of content) {
                if (c.type === 'output_text' || c.type === 'text') {
                  const text = c.text || c.content;
                  if (text) return String(text).trim();
                }
              }
              // 兜底：返回第一个有 text 的
              const firstWithText = content.find((c: any) => c.text || c.content);
              if (firstWithText) {
                return String(firstWithText.text || firstWithText.content).trim();
              }
            }
            
            if (content?.text) {
              return String(content.text).trim();
            }
          }
          
          // 情况 5b: output_text 类型
          if (item.type === 'output_text') {
            const text = item.text || item.content;
            if (text) return String(text).trim();
          }
          
          // 情况 5c: text 类型
          if (item.type === 'text') {
            const text = item.text || item.content;
            if (text) return String(text).trim();
          }
        }
      }
      
      // 情况 6: 兜底 - 尝试在 data 中找到任何字符串属性包含 text
      const textPaths = [
        'text', 'output', 'content', 'message',
        'result', 'response', 'answer', 'reply'
      ];
      
      for (const path of textPaths) {
        if (data[path] && typeof data[path] === 'string' && data[path].length > 10) {
          return data[path].trim();
        }
      }
      
      // 无法解析
      console.warn(`[OpenClawAdapter]     Cannot extract text from response`);
      console.warn(`[OpenClawAdapter]     Response keys: ${Object.keys(data).join(', ')}`);
      console.warn(`[OpenClawAdapter]     Response preview: ${JSON.stringify(data).slice(0, 300)}`);
      return null;
      
    } catch (error) {
      console.error(`[OpenClawAdapter]     Error extracting text: ${error}`);
      return null;
    }
  }

  /**
   * 从 OpenClaw 响应中提取工具调用
   */
  private extractToolCalls(data: any): ToolCall[] | undefined {
    try {
      // 查找 tool_calls
      const toolCalls = data.output?.tool_calls;
      
      if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
        return undefined;
      }
      
      return toolCalls.map((tc: any, idx: number) => ({
        id: tc.id || `tool-${Date.now()}-${idx}`,
        name: tc.name || tc.tool?.name || 'unknown',
        arguments: tc.arguments || tc.tool?.input || {},
      }));
    } catch (error) {
      console.error(`[OpenClawAdapter]     Error extracting tool calls: ${error}`);
      return undefined;
    }
  }

  /**
   * 延迟工具
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
