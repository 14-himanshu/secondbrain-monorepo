import type { ExtractionSource, Platform, ExtractionValidation, ExtractionQuality, SourceType } from "./types.js";
export declare const assessExtractionQuality: (text: string, source: ExtractionSource, platform: Platform) => ExtractionValidation;
export declare const adjustConfidence: (baseConfidence: number, validation: ExtractionValidation) => number;
export declare const deriveExtractionQuality: (validation: ExtractionValidation, sourceType: SourceType) => ExtractionQuality;
//# sourceMappingURL=validation.d.ts.map