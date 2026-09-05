export interface YoutubeAnalysis {
  opening_hook: {
    score: number; // 0-100
    assessment: string;
    suggestion: string;
  };
  retention_analysis: {
    score: number; // 0-100
    assessment: string;
    drop_off_points: string[];
    suggestions: string[];
  };
  naturalness_analysis: {
    score: number; // 0-100
    is_ai_like: boolean;
    assessment: string;
    repetitive_ideas: string[];
    suggestions: string[];
  };
  virality_potential: {
    score: number; // 0-100
    assessment: string;
    key_factors: string[];
  };
  title_evaluation: {
    score: number;
    analysis: string;
    alternatives: string[];
  };
  ctr_analysis: {
    cohesion_score: number;
    analysis: string;
  };
  call_to_action: {
    evaluation: string;
    suggested_script: string;
  };
}

export interface SeoKeywords {
  primary_keywords: string[];
  secondary_keywords: string[];
  hashtags: string[];
  youtube_description: string;
  pinned_comment: string;
}

export interface PolicyAnalysis {
  risk_level: "An toàn" | "Thấp" | "Trung bình" | "Cao";
  overall_recommendation: string;
  inappropriate_content: {
    demonetization_risk: "An toàn" | "Thấp" | "Trung bình" | "Cao";
    analysis: string;
    recommendation: string;
  };
  flagged_segments: {
    segment: string;
    issue: string;
    severity: "Thấp" | "Trung bình" | "Cao";
    solution: string;
  }[];
}

export interface AnalysisReport {
  overall_score: number;
  overall_assessment: string;
  reason_for_deduction: string;
  youtube_analysis: YoutubeAnalysis;
  policy_analysis: PolicyAnalysis;
  seo_keywords: SeoKeywords;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}