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
import { CommentLineCountMetric } from './common/CommentLineCountMetric';
import { CommentRatioMetric } from './common/CommentRatioMetric';
import { CodeDuplicationMetric } from './CodeDuplicationMetric';
import { GetterSetterCountMetric } from './GetterSetterCountMetric';
import { ObjectTypeMetric } from './ObjectTypeMetric';
import { ConstructorCountMetric } from './ConstructorCountMetric';
import { InterfaceConstructorParameterCountMetric } from './InterfaceConstructorParameterCountMetric';
import { SingleResponsibilityMetric } from './SingleResponsibilityMetric';
import { CognitiveComplexityMetric } from './CognitiveComplexityMetric';
import { CommentLineCountMetricPython } from './python/CommentLineCountMetricPython';
import { CommentRatioMetricPython } from './python/CommentRatioMetricPython';
import { CodeDuplicationMetricV2 } from './common/CodeDuplicationMetricV2';

export class MetricFactory {
  private static registry = MetricRegistry.getInstance();


  public static initializeRegistry(): void {
    this.registerCommonMetrics();
    this.registerLanguageSpecificMetrics();
  }

  private static registerCommonMetrics(): void {
    const commonMetrics: Metric[] = [
      LineCountMetric,
      CodeDuplicationMetric,
      NestingDepthMetric,
      CodeDuplicationMetricV2
    ];

    this.registry.registerCommonMetrics(commonMetrics);
  }

  private static registerLanguageSpecificMetrics(): void {
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
      CommentLineCountMetric,
      CommentRatioMetric,

    ];
    this.registry.registerLanguageMetrics('csharp', csharpMetrics);
    
    const javascriptMetrics: Metric[] = [
      IfCountMetric,
      LoopCountMetric,
      LambdaCountMetric,
      MethodCountMetric,
      ClassCountMetric,
      AverageMethodSizeMetric,
      CognitiveComplexityMetric,
      CommentLineCountMetric,
      CommentRatioMetric,
    ];
    this.registry.registerLanguageMetrics('javascript', javascriptMetrics);
    
    const typescriptMetrics: Metric[] = [
      IfCountMetric,
      LoopCountMetric,
      LambdaCountMetric,
      MethodCountMetric,
      ClassCountMetric,
      AverageMethodSizeMetric,
      InterfaceConstructorParameterCountMetric,
      CognitiveComplexityMetric,
      CommentLineCountMetric,
      CommentRatioMetric,
    ];
    this.registry.registerLanguageMetrics('typescript', typescriptMetrics);
    
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
    
    const javaMetrics: Metric[] = [
      IfCountMetric,
      LoopCountMetric,
      LambdaCountMetric,
      MethodCountMetric,
      ClassCountMetric,
      AverageMethodSizeMetric,
      GetterSetterCountMetric,
      ConstructorCountMetric,
      CognitiveComplexityMetric,
      CommentLineCountMetric,
      CommentRatioMetric,
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
