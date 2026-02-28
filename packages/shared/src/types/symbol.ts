export interface SymbolDefinition {
  readonly id: string;
  readonly name: string;
  readonly wild?: boolean;
  readonly scatter?: boolean;
}
