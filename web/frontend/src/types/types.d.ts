declare module "d3-regression" {
  export function regressionPoly(): any;
  export function regressionLinear(): any;
  export function regressionLoess(): any;
  // Add other exports as needed
}

declare interface Number {
  toInternational(locale?: string, decimals?: number): string;
}

declare interface String {
  fromInternational(): number;
  toInternational(locale?: string, decimals?: number): string;
}
