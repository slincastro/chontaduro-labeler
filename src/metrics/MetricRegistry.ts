import * as vscode from 'vscode';
import { Metric, MetricResult } from './Metric';

/**
 * Registry for code metrics that supports common metrics and language-specific metrics.
 */
export class MetricRegistry {
  private static instance: MetricRegistry;
  
  // Common metrics that apply to all languages
  private commonMetrics: Map<string, Metric> = new Map();
  
  // Language-specific metrics
  private languageMetrics: Map<string, Map<string, Metric>> = new Map();

  /**
   * Get the singleton instance of the MetricRegistry
   */
  public static getInstance(): MetricRegistry {
    if (!MetricRegistry.instance) {
      MetricRegistry.instance = new MetricRegistry();
    }
    return MetricRegistry.instance;
  }

  /**
   * Register a common metric that applies to all languages
   * @param metric The metric to register
   */
  public registerCommonMetric(metric: Metric): void {
    this.commonMetrics.set(metric.name, metric);
  }

  /**
   * Register multiple common metrics at once
   * @param metrics Array of metrics to register
   */
  public registerCommonMetrics(metrics: Metric[]): void {
    metrics.forEach(metric => this.registerCommonMetric(metric));
  }

  /**
   * Register a language-specific metric
   * @param languageId The language identifier (e.g., 'typescript', 'python', 'csharp')
   * @param metric The metric to register
   */
  public registerLanguageMetric(languageId: string, metric: Metric): void {
    if (!this.languageMetrics.has(languageId)) {
      this.languageMetrics.set(languageId, new Map());
    }
    
    const metricsForLanguage = this.languageMetrics.get(languageId)!;
    metricsForLanguage.set(metric.name, metric);
  }

  /**
   * Register multiple language-specific metrics at once
   * @param languageId The language identifier
   * @param metrics Array of metrics to register
   */
  public registerLanguageMetrics(languageId: string, metrics: Metric[]): void {
    metrics.forEach(metric => this.registerLanguageMetric(languageId, metric));
  }

  /**
   * Get all metrics for a specific language (common + language-specific)
   * @param languageId The language identifier
   * @returns Array of all applicable metrics for the language
   */
  public getMetricsForLanguage(languageId: string): Metric[] {
    const metrics: Metric[] = [];
    
    // Add all common metrics
    this.commonMetrics.forEach(metric => metrics.push(metric));
    
    // Add language-specific metrics if they exist
    if (this.languageMetrics.has(languageId)) {
      const languageSpecificMetrics = this.languageMetrics.get(languageId)!;
      languageSpecificMetrics.forEach(metric => metrics.push(metric));
    }
    
    return metrics;
  }

  /**
   * Execute all applicable metrics on a document
   * @param document The document to analyze
   * @returns Array of metric results
   */
  public executeMetrics(document: vscode.TextDocument): MetricResult[] {
    const languageId = document.languageId.toLowerCase();
    const metrics = this.getMetricsForLanguage(languageId);
    
    return metrics.map(metric => metric.extract(document));
  }

  /**
   * Clear all registered metrics
   */
  public clear(): void {
    this.commonMetrics.clear();
    this.languageMetrics.clear();
  }

  /**
   * Get all registered common metrics
   */
  public getCommonMetrics(): Metric[] {
    return Array.from(this.commonMetrics.values());
  }

  /**
   * Get all registered language-specific metrics for a language
   * @param languageId The language identifier
   */
  public getLanguageSpecificMetrics(languageId: string): Metric[] {
    if (!this.languageMetrics.has(languageId)) {
      return [];
    }
    
    return Array.from(this.languageMetrics.get(languageId)!.values());
  }

  /**
   * Get all supported languages (languages with specific metrics)
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this.languageMetrics.keys());
  }
}
