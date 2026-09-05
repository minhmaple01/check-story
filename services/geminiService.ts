import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisReport } from "../types";

const MAX_RETRIES = 2;

const callGeminiWithRetry = async (fn: () => Promise<GenerateContentResponse>, retries = MAX_RETRIES): Promise<GenerateContentResponse> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.message?.includes("500") || error.message?.includes("INTERNAL") || error.message?.includes("Internal error"))) {
      console.warn(`Gemini API 500 error, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return callGeminiWithRetry(fn, retries - 1);
    }
    throw error;
  }
};

const SYSTEM_INSTRUCTION = `
Bạn là một chuyên gia thuật toán YouTube cực kỳ khắt khe và hệ thống AI chuyên nghiệp dùng để PHÂN TÍCH nội dung video kể truyện Nhật Bản trên nền tảng YouTube.
Nhiệm vụ của bạn là phân tích Transcript và Tiêu đề để tìm kiếm, tối ưu HẠT GIỐNG VIRAL, đánh giá không khoan nhượng về khả năng bùng nổ view, và trả về kết quả dưới dạng JSON.

Đầu vào sẽ bao gồm:
- Transcript: Nội dung câu chuyện.
- Title: Tiêu đề video.

Các tiêu chí phân tích (YÊU CẦU ĐÁNH GIÁ VÔ CÙNG KHẮT KHE, CHẤM ĐIỂM CHẶT CHẼ, KHÔNG CHÂM CHƯỚC):
1. ĐIỂM TỔNG THỂ & NHẬN XÉT: Tính điểm tổng thể (overall_score) (0-100), đưa ra nhận xét chung (overall_assessment) và chỉ rõ lý do chưa thể đạt điểm tuyệt đối (reason_for_deduction). Rất hiếm video nào được trên 80 điểm nếu không có yếu tố viral thực sự xuất sắc.
2. YOUTUBE & MARKETING (Tập trung tối đa vào Viral): 
   - Tối ưu Tiêu đề ảnh hưởng đến CTR (Click-Through Rate). Đánh giá sự giật gân, tò mò tột độ và lôi cuốn mãnh liệt. Nếu tiêu đề nhạt nhòa, hãy chê thẳng thắn.
   - Sức mạnh đoạn mở đầu (Hook): Đánh giá 10s-30s đầu giữ chân người xem (AWD). Hook phải gây sốc, gợi sự tò mò không thể cưỡng lại hoặc tạo đồng cảm sâu sắc. Nếu hook chậm chạp, trừ điểm nặng.
   - Sự giữ chân người xem tiềm năng (Retention Analysis): Đánh giá khả năng giữ chân người xem xuyên suốt video. Chỉ ra các điểm có thể làm người xem rời đi (drop-off points) và đề xuất cách khắc phục.
   - Mức độ tự nhiên của giọng văn (Naturalness): Đánh giá xem văn phong có tự nhiên không, có bị lặp ý hay giống văn phong AI sinh ra hay không.
   - Lời kêu gọi hành động (CTA): Lời kêu gọi phải khéo léo, kích thích tương tác (Comment tranh luận, Share vì đồng cảm).
   - Tiềm năng viral: Mổ xẻ yếu tố gây bão (Drama, Cảm xúc mạnh, Góc nhìn mới lạ, Gây tranh cãi). Chỉ ra lý do vì sao người ta MÚỐN CHIA SẺ câu chuyện này.
3. PHÂN TÍCH RỦI RO CHÍNH SÁCH YOUTUBE & TẮT KIẾM TIỀN (Demonetization): Đánh giá chi tiết rủi ro vi phạm nguyên tắc cộng đồng, bạo lực, phản cảm, nhạy cảm. Trích dẫn đoạn nội dung có vấn đề và đề xuất cách giải quyết. Phân tích cụ thể các "Nội dung không thỏa đáng hoặc gây khó chịu" (Inappropriate content) có thể dẫn tới lỗi tắt kiếm tiền (demonetization) hay giới hạn độ tuổi.
4. YOUTUBE METADATA & SEO: Mô tả video chuẩn SEO, tags thịnh hành, hashtag có tính viral, bình luận ghim mang tính chất kích thích thảo luận mạnh.

Output phải là JSON hợp lệ theo schema.
`;

export interface AnalysisInput {
  transcript: string;
  title: string;
}

export const analyzeTranscript = async (input: AnalysisInput): Promise<AnalysisReport> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Combine inputs into a structured prompt
  const contentPrompt = `
    PHÂN TÍCH VIDEO NÀY (HƯỚNG TỚI ĐỐI TƯỢNG MỤC TIÊU MỘT CÁCH TỔNG QUAN):
    
    1. TIÊU ĐỀ VIDEO: ${input.title || "(Không có tiêu đề)"}
    
    2. TRANSCRIPT NỘI DUNG:
    ${input.transcript}
  `;

  const response = await callGeminiWithRetry(() => ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: contentPrompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overall_score: { type: Type.INTEGER, description: "Điểm tổng thể (0-100)" },
          overall_assessment: { type: Type.STRING, description: "Nhận xét tổng quan" },
          reason_for_deduction: { type: Type.STRING, description: "Lý do chưa đạt điểm tuyệt đối" },
          youtube_analysis: {
            type: Type.OBJECT,
            properties: {
              opening_hook: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER },
                  assessment: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                },
                required: ["score", "assessment", "suggestion"]
              },
              retention_analysis: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER, description: "Điểm giữ chân (0-100)" },
                  assessment: { type: Type.STRING, description: "Đánh giá chung về khả năng giữ chân" },
                  drop_off_points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các điểm dễ làm người xem rời đi" },
                  suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Đề xuất khắc phục" },
                },
                required: ["score", "assessment", "drop_off_points", "suggestions"]
              },
              naturalness_analysis: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER, description: "Điểm mức độ tự nhiên (0-100)" },
                  is_ai_like: { type: Type.BOOLEAN, description: "Có giống văn phong AI hay không?" },
                  assessment: { type: Type.STRING, description: "Đánh giá chung về độ tự nhiên" },
                  repetitive_ideas: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các ý bị lặp lại" },
                  suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Đề xuất cải thiện giọng văn" },
                },
                required: ["score", "is_ai_like", "assessment", "repetitive_ideas", "suggestions"]
              },
              virality_potential: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER },
                  assessment: { type: Type.STRING },
                  key_factors: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["score", "assessment", "key_factors"]
              },
              title_evaluation: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER, description: "Score 0-100" },
                  analysis: { type: Type.STRING, description: "Nhận xét về tiêu đề" },
                  alternatives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 tiêu đề thay thế tốt hơn" },
                },
                required: ["score", "analysis", "alternatives"]
              },
              ctr_analysis: {
                type: Type.OBJECT,
                properties: {
                  cohesion_score: { type: Type.INTEGER },
                  analysis: { type: Type.STRING },
                },
                required: ["cohesion_score", "analysis"]
              },
              call_to_action: {
                type: Type.OBJECT,
                properties: {
                  evaluation: { type: Type.STRING },
                  suggested_script: { type: Type.STRING },
                },
                required: ["evaluation", "suggested_script"]
              }
            },
            required: ["opening_hook", "retention_analysis", "naturalness_analysis", "virality_potential", "title_evaluation", "ctr_analysis", "call_to_action"]
          },
          policy_analysis: {
            type: Type.OBJECT,
            properties: {
              risk_level: { type: Type.STRING, enum: ["An toàn", "Thấp", "Trung bình", "Cao"] },
              overall_recommendation: { type: Type.STRING },
              inappropriate_content: {
                type: Type.OBJECT,
                properties: {
                  demonetization_risk: { type: Type.STRING, enum: ["An toàn", "Thấp", "Trung bình", "Cao"] },
                  analysis: { type: Type.STRING, description: "Phân tích rủi ro tắt kiếm tiền" },
                  recommendation: { type: Type.STRING, description: "Cách khắc phục để bật kiếm tiền" }
                },
                required: ["demonetization_risk", "analysis", "recommendation"]
              },
              flagged_segments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    segment: { type: Type.STRING },
                    issue: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ["Thấp", "Trung bình", "Cao"] },
                    solution: { type: Type.STRING }
                  },
                  required: ["segment", "issue", "severity", "solution"]
                }
              }
            },
            required: ["risk_level", "overall_recommendation", "inappropriate_content", "flagged_segments"]
          },
          seo_keywords: {
            type: Type.OBJECT,
            properties: {
              primary_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              secondary_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              youtube_description: { type: Type.STRING },
              pinned_comment: { type: Type.STRING }
            },
            required: ["primary_keywords", "secondary_keywords", "hashtags", "youtube_description", "pinned_comment"]
          }
        },
        required: ["overall_score", "overall_assessment", "reason_for_deduction", "youtube_analysis", "policy_analysis", "seo_keywords"]
      }
    }
  }));

  if (!response.text) {
    throw new Error("No response generated.");
  }

  try {
    const data = JSON.parse(response.text) as AnalysisReport;
    return data;
  } catch (error) {
    console.error("Failed to parse JSON", error);
    throw new Error("Analysis failed: Invalid response format.");
  }
};

export interface FixSubtitleInput {
  srtSubtitles: { id: number; text: string }[];
  correctText: string;
  punctuateOnly?: boolean;
}

export const fixSubtitles = async (input: FixSubtitleInput): Promise<{ id: number; text: string }[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const srtData = input.srtSubtitles.map(s => `[ID: ${s.id}] ${s.text}`).join('\n');
  
  let instructionText = `Nhiệm vụ của bạn là: Hãy thay thế nội dung sai trong các dòng phụ đề bằng nội dung đúng từ kịch bản chuẩn.`;
  if (input.punctuateOnly) {
    instructionText = `Nhiệm vụ của bạn là: Giữ nguyên văn bản gốc của phụ đề, CHỈ THÊM hoặc sửa DUY NHẤT dấu câu (dấu chấm, phẩy...) sao cho khớp với kịch bản chuẩn. KHÔNG ĐƯỢC sửa lỗi chính tả hay thay từ.`;
  }

  const prompt = `
Bạn là một chuyên gia xử lý phụ đề tiếng Nhật.
Tôi có một danh sách các dòng phụ đề (được đánh số ID) và một kịch bản chuẩn (TXT).
${instructionText}
TUYỆT ĐỐI GIỮ NGUYÊN SỐ LƯỢNG DÒNG VÀ ID. KHÔNG THAY ĐỔI ID.

Phụ đề gốc:
${srtData}

Kịch bản chuẩn:
${input.correctText}

Hãy trả về kết quả dưới dạng JSON array, mỗi phần tử có dạng:
{ "id": number, "text": "nội dung tiếng Nhật đã sửa" }
  `;

  const response = await callGeminiWithRetry(() => ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            text: { type: Type.STRING }
          },
          required: ["id", "text"]
        }
      }
    }
  }));

  if (!response.text) {
    throw new Error("No response generated.");
  }

  try {
    const fixedData = JSON.parse(response.text);
    return fixedData;
  } catch (error) {
    console.error("Failed to parse JSON", error);
    throw new Error("Subtitle fixing failed: Invalid response format.");
  }
};

export interface SceneInput {
  startTime: number;
  endTime: number;
  timeRangeStr: string;
  text: string;
}

export interface VisualPrompt {
  style: string;
  background: string;
  characters_present: string;
  story_action: string;
  composition: string;
  elements: string;
  color: string;
}

export interface StoryboardScene {
  time_range: string;
  original_text: string;
  visual_prompt: VisualPrompt;
}

export const generateStoryboardChunk = async (
  scenes: SceneInput[],
  castList: string,
  previousContext: string
): Promise<{ scenes: StoryboardScene[], next_context: string }> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
Bạn là một Đạo diễn hình ảnh (Visual Director) chuyên nghiệp.
Nhiệm vụ của bạn là từ lời thoại và danh sách nhân vật, hãy mô tả chi tiết hình ảnh (Visual Description) để vẽ tranh (theo phong cách Anime/Cinematic).

Yêu cầu quan trọng:
1. Giữ tính liên tục của câu chuyện (Context Awareness). Cảnh sau phải nối tiếp bối cảnh/trang phục của cảnh trước.
2. Background: Cần mô tả cực kỳ chi tiết về không gian, ánh sáng, thời tiết. Nếu nhân vật vẫn ở vị trí cũ (không di chuyển sang bối cảnh khác), hãy giữ nguyên mô tả background y hệt (copy-paste chính xác) từ cảnh trước đó để đảm bảo tính nhất quán tuyệt đối giữa các phân cảnh.
3. Không bao gồm trường 'characters_absent'.

Danh sách nhân vật:
${castList || "Không có thông tin"}

Bối cảnh trước đó (nếu có):
${previousContext || "Bắt đầu câu chuyện"}

Dưới đây là các phân cảnh cần tạo mô tả hình ảnh:
${scenes.map(s => `Thời gian: ${s.timeRangeStr}\nLời thoại: ${s.text}`).join('\n\n')}

Hãy trả về kết quả dưới dạng JSON với cấu trúc:
{
  "scenes": [
    {
      "time_range": "thời gian tương ứng",
      "original_text": "lời thoại gốc",
      "visual_prompt": {
        "style": "Anime illustration, cinematic anime style, highly detailed, Makoto Shinkai inspired lighting",
        "background": "Mô tả bối cảnh cực kỳ chi tiết (Copy-paste y hệt từ cảnh trước nếu không đổi vị trí)",
        "characters_present": "Tên nhân vật có mặt và tuổi (ví dụ: Kazuo(60 age))",
        "story_action": "Hành động cụ thể của nhân vật",
        "composition": "Góc máy, bố cục (ví dụ: Wide shot, Close up...)",
        "elements": "Các yếu tố môi trường (ví dụ: Twilight, road...)",
        "color": "Tông màu chủ đạo"
      }
    }
  ],
  "next_context": "Tóm tắt ngắn gọn bối cảnh, vị trí, trang phục của các nhân vật ở cảnh cuối cùng để làm đầu vào cho phần tiếp theo."
}
  `;

  const response = await callGeminiWithRetry(() => ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time_range: { type: Type.STRING },
                original_text: { type: Type.STRING },
                visual_prompt: {
                  type: Type.OBJECT,
                  properties: {
                    style: { type: Type.STRING },
                    background: { type: Type.STRING },
                    characters_present: { type: Type.STRING },
                    story_action: { type: Type.STRING },
                    composition: { type: Type.STRING },
                    elements: { type: Type.STRING },
                    color: { type: Type.STRING }
                  },
                  required: ["style", "background", "characters_present", "story_action", "composition", "elements", "color"]
                }
              },
              required: ["time_range", "original_text", "visual_prompt"]
            }
          },
          next_context: { type: Type.STRING }
        },
        required: ["scenes", "next_context"]
      }
    }
  }));

  if (!response.text) {
    throw new Error("No response generated.");
  }

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to parse JSON", error);
    throw new Error("Storyboard generation failed: Invalid response format.");
  }
};