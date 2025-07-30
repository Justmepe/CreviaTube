import { z } from "zod";

// AI Content Detection Service
export interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number;
  flags: string[];
  analysis: {
    textPatterns: number;
    repetitiveStructure: number;
    vocabularyComplexity: number;
    naturalFlow: number;
    personalTone: number;
  };
  recommendation: 'approve' | 'review' | 'reject';
}

export interface ContentSubmission {
  type: 'text' | 'video' | 'image' | 'audio';
  content: string;
  metadata?: {
    length?: number;
    language?: string;
    platform?: string;
  };
}

export class AIContentDetectionService {
  private readonly AI_DETECTION_THRESHOLD = 0.7; // 70% confidence threshold
  private readonly REVIEW_THRESHOLD = 0.4; // 40% confidence for manual review

  /**
   * Analyze content for AI generation indicators
   */
  async analyzeContent(submission: ContentSubmission): Promise<AIDetectionResult> {
    try {
      const analysis = this.performTextAnalysis(submission.content);
      const flags = this.detectAIFlags(submission.content, analysis);
      const confidence = this.calculateAIConfidence(analysis, flags);
      
      return {
        isAIGenerated: confidence >= this.AI_DETECTION_THRESHOLD,
        confidence,
        flags,
        analysis,
        recommendation: this.getRecommendation(confidence)
      };
    } catch (error) {
      console.error('AI detection error:', error);
      // Default to manual review on error
      return {
        isAIGenerated: false,
        confidence: 0.5,
        flags: ['analysis_error'],
        analysis: {
          textPatterns: 0.5,
          repetitiveStructure: 0.5,
          vocabularyComplexity: 0.5,
          naturalFlow: 0.5,
          personalTone: 0.5
        },
        recommendation: 'review'
      };
    }
  }

  /**
   * Perform detailed text analysis
   */
  private performTextAnalysis(content: string) {
    const words = content.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      textPatterns: this.analyzeTextPatterns(content, words, sentences),
      repetitiveStructure: this.analyzeRepetitiveStructure(sentences),
      vocabularyComplexity: this.analyzeVocabularyComplexity(words),
      naturalFlow: this.analyzeNaturalFlow(sentences),
      personalTone: this.analyzePersonalTone(content)
    };
  }

  /**
   * Analyze text patterns that indicate AI generation
   */
  private analyzeTextPatterns(content: string, words: string[], sentences: string[]): number {
    let aiScore = 0;
    
    // Check for AI-typical phrases
    const aiPhrases = [
      'as an ai', 'i understand that', 'it\'s important to note',
      'furthermore', 'moreover', 'in conclusion', 'to summarize',
      'it\'s worth noting', 'additionally', 'however, it\'s important'
    ];
    
    const foundAiPhrases = aiPhrases.filter(phrase => 
      content.toLowerCase().includes(phrase)
    ).length;
    
    aiScore += Math.min(foundAiPhrases * 0.3, 0.8);
    
    // Check sentence length uniformity (AI tends to have consistent length)
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    const lengthVariance = this.calculateVariance(
      sentences.map(s => s.split(' ').length)
    );
    
    if (avgSentenceLength > 15 && lengthVariance < 20) {
      aiScore += 0.3; // Very uniform sentence length suggests AI
    }
    
    return Math.min(aiScore, 1);
  }

  /**
   * Analyze repetitive structure patterns
   */
  private analyzeRepetitiveStructure(sentences: string[]): number {
    if (sentences.length < 3) return 0;
    
    let repetitiveScore = 0;
    
    // Check for repetitive sentence starters
    const starters = sentences.map(s => s.trim().split(' ')[0]?.toLowerCase()).filter(Boolean);
    const starterCounts = starters.reduce((acc, starter) => {
      acc[starter] = (acc[starter] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxRepetition = Math.max(...Object.values(starterCounts));
    if (maxRepetition > sentences.length * 0.4) {
      repetitiveScore += 0.4;
    }
    
    // Check for repetitive structure words
    const structureWords = ['however', 'therefore', 'furthermore', 'moreover', 'additionally'];
    const structureCount = sentences.filter(s =>
      structureWords.some(word => s.toLowerCase().includes(word))
    ).length;
    
    if (structureCount > sentences.length * 0.5) {
      repetitiveScore += 0.3;
    }
    
    return Math.min(repetitiveScore, 1);
  }

  /**
   * Analyze vocabulary complexity
   */
  private analyzeVocabularyComplexity(words: string[]): number {
    if (words.length === 0) return 0;
    
    // Calculate vocabulary diversity
    const uniqueWords = new Set(words);
    const diversity = uniqueWords.size / words.length;
    
    // Check for overly complex vocabulary (AI tends to use sophisticated words)
    const complexWords = [
      'furthermore', 'nevertheless', 'consequently', 'subsequently',
      'utilize', 'facilitate', 'demonstrate', 'comprehensively',
      'significantly', 'substantial', 'encompass', 'methodology'
    ];
    
    const complexWordCount = words.filter(word =>
      complexWords.includes(word)
    ).length;
    
    const complexityRatio = complexWordCount / words.length;
    
    // High complexity + high diversity might indicate AI
    let aiScore = 0;
    if (complexityRatio > 0.1 && diversity > 0.7) {
      aiScore += 0.5;
    }
    
    // Very low diversity might also indicate AI templates
    if (diversity < 0.3) {
      aiScore += 0.3;
    }
    
    return Math.min(aiScore, 1);
  }

  /**
   * Analyze natural flow and human-like writing
   */
  private analyzeNaturalFlow(sentences: string[]): number {
    let unnaturalScore = 0;
    
    // Check for overly perfect grammar/structure
    const perfectStructureCount = sentences.filter(s => {
      const trimmed = s.trim();
      return trimmed.length > 0 && 
             trimmed[0] === trimmed[0].toUpperCase() && // Starts with capital
             /[.!?]$/.test(trimmed); // Ends with punctuation
    }).length;
    
    if (perfectStructureCount === sentences.length && sentences.length > 3) {
      unnaturalScore += 0.3; // Too perfect might be AI
    }
    
    // Check for lack of contractions (humans use more contractions)
    const contractions = /\b(don't|won't|can't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|couldn't|shouldn't|wouldn't|didn't|doesn't)\b/gi;
    const contractionCount = (sentences.join(' ').match(contractions) || []).length;
    const contractionRatio = contractionCount / sentences.length;
    
    if (contractionRatio < 0.1 && sentences.length > 5) {
      unnaturalScore += 0.2; // Too formal might be AI
    }
    
    return Math.min(unnaturalScore, 1);
  }

  /**
   * Analyze personal tone and human elements
   */
  private analyzePersonalTone(content: string): number {
    let personalScore = 0;
    
    // Check for personal pronouns and experiences
    const personalIndicators = [
      /\bi\s/gi, /\bme\b/gi, /\bmy\b/gi, /\bmyself\b/gi,
      /\bwe\b/gi, /\bour\b/gi, /\bus\b/gi
    ];
    
    const personalCount = personalIndicators.reduce((count, pattern) =>
      count + (content.match(pattern) || []).length, 0
    );
    
    // Check for emotional expressions
    const emotionalWords = [
      'love', 'hate', 'excited', 'amazing', 'terrible', 'awesome',
      'frustrated', 'happy', 'sad', 'angry', 'thrilled', 'disappointed'
    ];
    
    const emotionalCount = emotionalWords.filter(word =>
      content.toLowerCase().includes(word)
    ).length;
    
    // More personal content is less likely to be AI
    const words = content.split(/\s+/).length;
    const personalRatio = personalCount / words;
    const emotionalRatio = emotionalCount / words;
    
    if (personalRatio > 0.05 || emotionalRatio > 0.02) {
      personalScore = 1 - Math.min((personalRatio + emotionalRatio) * 5, 0.8);
    } else {
      personalScore = 0.7; // Lack of personal tone suggests AI
    }
    
    return Math.min(personalScore, 1);
  }

  /**
   * Detect specific AI generation flags
   */
  private detectAIFlags(content: string, analysis: any): string[] {
    const flags: string[] = [];
    
    // Check for ChatGPT-specific patterns
    if (content.toLowerCase().includes('as an ai') || 
        content.toLowerCase().includes('i cannot') ||
        content.toLowerCase().includes('i am an ai')) {
      flags.push('ai_self_reference');
    }
    
    // Check for typical AI hedging language
    const hedgingPhrases = [
      'it\'s important to note', 'it\'s worth mentioning',
      'keep in mind that', 'please note that'
    ];
    
    if (hedgingPhrases.some(phrase => content.toLowerCase().includes(phrase))) {
      flags.push('ai_hedging_language');
    }
    
    // Check for overly structured content
    if (analysis.repetitiveStructure > 0.6) {
      flags.push('repetitive_structure');
    }
    
    // Check for unnatural vocabulary
    if (analysis.vocabularyComplexity > 0.7) {
      flags.push('unnatural_vocabulary');
    }
    
    // Check for lack of personal elements
    if (analysis.personalTone > 0.8) {
      flags.push('impersonal_tone');
    }
    
    return flags;
  }

  /**
   * Calculate overall AI confidence score
   */
  private calculateAIConfidence(analysis: any, flags: string[]): number {
    const weights = {
      textPatterns: 0.25,
      repetitiveStructure: 0.20,
      vocabularyComplexity: 0.20,
      naturalFlow: 0.20,
      personalTone: 0.15
    };
    
    let confidence = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      confidence += analysis[key] * weight;
    });
    
    // Add flag penalties
    const flagPenalty = Math.min(flags.length * 0.1, 0.3);
    confidence += flagPenalty;
    
    return Math.min(confidence, 1);
  }

  /**
   * Get recommendation based on confidence score
   */
  private getRecommendation(confidence: number): 'approve' | 'review' | 'reject' {
    if (confidence >= this.AI_DETECTION_THRESHOLD) {
      return 'reject';
    } else if (confidence >= this.REVIEW_THRESHOLD) {
      return 'review';
    } else {
      return 'approve';
    }
  }

  /**
   * Calculate variance for array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
    
    return variance;
  }

  /**
   * Batch analyze multiple content pieces
   */
  async batchAnalyzeContent(submissions: ContentSubmission[]): Promise<AIDetectionResult[]> {
    return Promise.all(submissions.map(submission => this.analyzeContent(submission)));
  }

  /**
   * Update detection thresholds (for admin configuration)
   */
  updateThresholds(aiThreshold: number, reviewThreshold: number): void {
    if (aiThreshold >= 0 && aiThreshold <= 1) {
      Object.defineProperty(this, 'AI_DETECTION_THRESHOLD', { value: aiThreshold, writable: false });
    }
    if (reviewThreshold >= 0 && reviewThreshold <= 1) {
      Object.defineProperty(this, 'REVIEW_THRESHOLD', { value: reviewThreshold, writable: false });
    }
  }
}

export const aiContentDetection = new AIContentDetectionService();