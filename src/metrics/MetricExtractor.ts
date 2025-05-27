import * as vscode from 'vscode';
import { Metric, MetricResult } from './Metric';
import { MetricRegistry } from './MetricRegistry';
import { MetricFactory } from './MetricFactory';

/**
 * Class responsible for extracting metrics from documents
 */
export class MetricExtractor {
  private registry: MetricRegistry;

  constructor() {
    this.registry = MetricRegistry.getInstance();
    
    // Initialize the registry if it's empty
    if (this.registry.getCommonMetrics().length === 0 && 
        this.registry.getSupportedLanguages().length === 0) {
      MetricFactory.initializeRegistry();
    }
  }

  /**
   * Extract all applicable metrics for a document
   * @param document The document to analyze
   * @returns Array of metric results
   */
  public extractMetrics(document: vscode.TextDocument): MetricResult[] {
    return this.registry.executeMetrics(document);
  }

  /**
   * Get all metrics for a specific language
   * @param languageId The language identifier
   * @returns Array of metrics for the language
   */
  public getMetricsForLanguage(languageId: string): Metric[] {
    return this.registry.getMetricsForLanguage(languageId);
  }

  /**
   * Get all common metrics
   * @returns Array of common metrics
   */
  public getCommonMetrics(): Metric[] {
    return this.registry.getCommonMetrics();
  }

  /**
   * Get all language-specific metrics for a language
   * @param languageId The language identifier
   * @returns Array of language-specific metrics
   */
  public getLanguageSpecificMetrics(languageId: string): Metric[] {
    return this.registry.getLanguageSpecificMetrics(languageId);
  }

  /**
   * Get all supported languages
   * @returns Array of supported language identifiers
   */
  public getSupportedLanguages(): string[] {
    return this.registry.getSupportedLanguages();
  }
}

// Re-export the MetricResult interface for backward compatibility
export { MetricResult } from './Metric';
