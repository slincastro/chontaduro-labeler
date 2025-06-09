import { Metric } from './Metric';
import { MetricRegistry } from './MetricRegistry';
import { LineCountMetric } from './common/LineCountMetric';
import { IfCountMetric } from './common/IfCountMetric';
import { UsingCountMetric } from './common/UsingCountMetric';
import { LoopCountMetric } from './common/LoopCountMetric';
import { LambdaCountMetric } from './LambdaCountMetric';
import { MethodCountMetric } from './common/MethodCountMetric';
import { ClassCountMetric } from './common/ClassCountMetric';
import { AverageMethodSizeMetric } from './common/AverageMethodSizeMetric';
import { MethodCohesionMetric } from './MethodCohesionMetric';
import { NestingDepthMetric } from './common/NestingDepthMetric';
import { CommentLineCountMetric } from './common/CommentLineCountMetric';
import { CommentRatioMetric } from './common/CommentRatioMetric';
import { CodeDuplicationMetric } from './CodeDuplicationMetric';
import { GetterSetterCountMetric } from './GetterSetterCountMetric';
import { ObjectTypeMetric } from './ObjectTypeMetric';
import { ConstructorCountMetric } from './common/ConstructorCountMetric';
import { InterfaceConstructorParameterCountMetric } from './InterfaceConstructorParameterCountMetric';
import { SingleResponsibilityMetric } from './SingleResponsibilityMetric';
import { CognitiveComplexityMetric } from './common/CognitiveComplexityMetric';
import { CommentLineCountMetricPython } from './python/CommentLineCountMetricPython';
import { CommentRatioMetricPython } from './python/CommentRatioMetricPython';
import { CodeDuplicationMetricV2 } from './common/CodeDuplicationMetricV2';
import { NestingDepthMetricPython } from './python/NestingDepthMetricPython';
import { MethodCountMetricPython } from './python/MethodCountMetricPython';
import { CognitiveComplexityMetricPython } from './python/CognitiveComplexityMetricPython';
import { AverageMethodSizeMetricPython } from './python/AverageMethodSizeMetricPython';
import { PythonClassCountMetricPython } from './python/ClassCountMetricPython';
import { ConstructorCountMetricPython } from './python/ConstructorCountMetricPython';

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
      CodeDuplicationMetricV2,
      UsingCountMetric,
      IfCountMetric,
      LoopCountMetric,

    ];

    this.registry.registerCommonMetrics(commonMetrics);
  }

  private static registerLanguageSpecificMetrics(): void {
    const csharpMetrics: Metric[] = [
      ClassCountMetric,
      MethodCountMetric,
      LambdaCountMetric,
      AverageMethodSizeMetric,
      MethodCohesionMetric,
      GetterSetterCountMetric,
      ObjectTypeMetric,
      InterfaceConstructorParameterCountMetric,
      SingleResponsibilityMetric,
      CognitiveComplexityMetric,
      CommentLineCountMetric,
      CommentRatioMetric,
      ConstructorCountMetric
    ];
    this.registry.registerLanguageMetrics('csharp', csharpMetrics);
    
    const javascriptMetrics: Metric[] = [
      LambdaCountMetric,
      MethodCountMetric,
      ClassCountMetric,
      AverageMethodSizeMetric,
      CognitiveComplexityMetric,
      CommentLineCountMetric,
      CommentRatioMetric,
      ConstructorCountMetric
    ];
    this.registry.registerLanguageMetrics('javascript', javascriptMetrics);
    
    const typescriptMetrics: Metric[] = [
      LambdaCountMetric,
      MethodCountMetric,
      ClassCountMetric,
      AverageMethodSizeMetric,
      InterfaceConstructorParameterCountMetric,
      CognitiveComplexityMetric,
      CommentLineCountMetric,
      CommentRatioMetric,
      ConstructorCountMetric
    ];
    this.registry.registerLanguageMetrics('typescript', typescriptMetrics);
    
    const pythonMetrics: Metric[] = [
      LambdaCountMetric,
      MethodCountMetricPython,
      CommentLineCountMetricPython,
      CommentRatioMetricPython,
      NestingDepthMetricPython,
      CognitiveComplexityMetricPython,
      AverageMethodSizeMetricPython,
      PythonClassCountMetricPython,
      ConstructorCountMetricPython,
    ];
    this.registry.registerLanguageMetrics('python', pythonMetrics);
    
    const javaMetrics: Metric[] = [
      LambdaCountMetric,
      MethodCountMetric,
      ClassCountMetric,
      AverageMethodSizeMetric,
      GetterSetterCountMetric,
      CognitiveComplexityMetric,
      CommentLineCountMetric,
      CommentRatioMetric,
      ConstructorCountMetricPython
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
