import { Metric } from './Metric';
import { MetricRegistry } from './MetricRegistry';
import { LineCountMetric } from './LineCountMetric';
import { IfCountMetric } from './IfCountMetric';
import { UsingCountMetric } from './UsingCountMetric';
import { LoopCountMetric } from './LoopCountMetric';
import { LambdaCountMetric } from './LambdaCountMetric';
import { MethodCountMetric } from './MethodCountMetric';
import { ClassCountMetric } from './ClassCountMetric';
import { AverageMethodSizeMetric } from './AverageMethodSizeMetric';
import { MethodCohesionMetric } from './MethodCohesionMetric';
import { NestingDepthMetric } from './NestingDepthMetric';
import { CommentLineCountMetric } from './CommentLineCountMetric';
import { CommentRatioMetric } from './CommentRatioMetric';
import { CodeDuplicationMetric } from './CodeDuplicationMetric';
import { GetterSetterCountMetric } from './GetterSetterCountMetric';
import { ObjectTypeMetric } from './ObjectTypeMetric';
import { ConstructorCountMetric } from './ConstructorCountMetric';
import { InterfaceConstructorParameterCountMetric } from './InterfaceConstructorParameterCountMetric';
import { SingleResponsibilityMetric } from './SingleResponsibilityMetric';
import { CognitiveComplexityMetric } from './CognitiveComplexityMetric';
import { CommentLineCountMetricPython } from './python/CommentLineCountMetricPython';
import { CommentRatioMetricPython } from './python/CommentRatioMetricPython';

/**
 * Factory class for creating and registering metrics
 */
export class MetricFactory {
  private static registry = MetricRegistry.getInstance();

  /**
   * Initialize the metric registry with all available metrics
   */
  public static initializeRegistry(): void {
    this.registerCommonMetrics();
    this.registerLanguageSpecificMetrics();
  }

  /**
   * Register all common metrics that apply to all languages
   */
  private static registerCommonMetrics(): void {
    const commonMetrics: Metric[] = [
      LineCountMetric,
      CommentLineCountMetric,
      CommentRatioMetric,
      CodeDuplicationMetric,
      NestingDepthMetric
    ];

    this.registry.registerCommonMetrics(commonMetrics);
  }

  /**
   * Register all language-specific metrics
   */
  private static registerLanguageSpecificMetrics(): void {
    // C# specific metrics
    const csharpMetrics: Metric[] = [
      UsingCountMetric,
      ClassCountMetric,
      MethodCountMetric,
      IfCountMetric,
      LoopCountMetric,
      LambdaCountMetric,
      AverageMethodSizeMetric,
      MethodCohesionMetric,
      GetterSetterCountMetric,
      ObjectTypeMetric,
      ConstructorCountMetric,
      InterfaceConstructorParameterCountMetric,
      SingleResponsibilityMetric,
      CognitiveComplexityMetric,

    ];
    this.registry.registerLanguageMetrics('csharp', csharpMetrics);
    
    // JavaScript specific metrics
    const javascriptMetrics: Metric[] = [
      IfCountMetric,
      LoopCountMetric,
      LambdaCountMetric,
      MethodCountMetric,
      ClassCountMetric,
      AverageMethodSizeMetric,
      CognitiveComplexityMetric
    ];
    this.registry.registerLanguageMetrics('javascript', javascriptMetrics);
    
    // TypeScript specific metrics
    const typescriptMetrics: Metric[] = [
      IfCountMetric,
      LoopCountMetric,
      LambdaCountMetric,
      MethodCountMetric,
      ClassCountMetric,
      AverageMethodSizeMetric,
      InterfaceConstructorParameterCountMetric,
      CognitiveComplexityMetric
    ];
    this.registry.registerLanguageMetrics('typescript', typescriptMetrics);
    
    // Python specific metrics
    const pythonMetrics: Metric[] = [
      IfCountMetric,
      LoopCountMetric,
      LambdaCountMetric,
      MethodCountMetric,
      ClassCountMetric,
      CognitiveComplexityMetric,
      CommentLineCountMetricPython,
      CommentRatioMetricPython
    ];
    this.registry.registerLanguageMetrics('python', pythonMetrics);
    
    // Java specific metrics
    const javaMetrics: Metric[] = [
      IfCountMetric,
      LoopCountMetric,
      LambdaCountMetric,
      MethodCountMetric,
      ClassCountMetric,
      AverageMethodSizeMetric,
      GetterSetterCountMetric,
      ConstructorCountMetric,
      CognitiveComplexityMetric
    ];
    this.registry.registerLanguageMetrics('java', javaMetrics);
  }

  /**
   * Get all metrics for a specific language
   * @param languageId The language identifier
   * @returns Array of metrics for the language
   */
  public static getMetricsForLanguage(languageId: string): Metric[] {
    return this.registry.getMetricsForLanguage(languageId);
  }

  /**
   * Get all common metrics
   * @returns Array of common metrics
   */
  public static getCommonMetrics(): Metric[] {
    return this.registry.getCommonMetrics();
  }

  /**
   * Get all language-specific metrics for a language
   * @param languageId The language identifier
   * @returns Array of language-specific metrics
   */
  public static getLanguageSpecificMetrics(languageId: string): Metric[] {
    return this.registry.getLanguageSpecificMetrics(languageId);
  }

  /**
   * Get all supported languages
   * @returns Array of supported language identifiers
   */
  public static getSupportedLanguages(): string[] {
    return this.registry.getSupportedLanguages();
  }
}
