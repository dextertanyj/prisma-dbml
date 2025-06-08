export interface PrintOptions {
  useAlias?: boolean;
  useNativeType?: boolean;
  expandImplicitManyToMany?: boolean;
}

export interface Printable {
  print(_: PrintOptions): string;
}
