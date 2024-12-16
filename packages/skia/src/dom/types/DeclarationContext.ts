import type {
  SkShader,
  SkPaint,
  SkImageFilter,
  SkMaskFilter,
  SkPathEffect,
  Skia,
  SkColorFilter,
} from "../../skia/types";

type Composer<T> = (outer: T, inner: T) => T;

export const composeDeclarations = <T>(filters: T[], composer: Composer<T>) => {
  "worklet";
  if (filters.length <= 1) {
    return filters[0];
  }
  return filters.reverse().reduce((inner, outer) => {
    if (!inner) {
      return outer;
    }
    return composer(outer, inner);
  });
};

class Declaration<T> {
  private decls: T[] = [];
  private indexes = [0];

  constructor(private composer?: Composer<T>) {}

  private get index() {
    return this.indexes[this.indexes.length - 1];
  }

  save() {
    this.indexes.push(this.decls.length);
  }

  restore() {
    this.indexes.pop();
  }

  pop() {
    return this.decls.pop();
  }

  push(decl: T) {
    this.decls.push(decl);
  }

  popAll() {
    return this.decls.splice(this.index, this.decls.length - this.index);
  }

  popAllAsOne() {
    if (!this.composer) {
      throw new Error("No composer for this type of declaration");
    }
    const decls = this.popAll();
    return composeDeclarations(decls, this.composer!);
  }
}

export class DeclarationContext {
  readonly paints: Declaration<SkPaint>;
  readonly maskFilters: Declaration<SkMaskFilter>;
  readonly shaders: Declaration<SkShader>;
  readonly pathEffects: Declaration<SkPathEffect>;
  readonly imageFilters: Declaration<SkImageFilter>;
  readonly colorFilters: Declaration<SkColorFilter>;

  constructor(public Skia: Skia) {
    const peComp = this.Skia.PathEffect.MakeCompose.bind(this.Skia.PathEffect);
    const ifComp = this.Skia.ImageFilter.MakeCompose.bind(
      this.Skia.ImageFilter
    );
    const cfComp = this.Skia.ColorFilter.MakeCompose.bind(
      this.Skia.ColorFilter
    );
    this.paints = new Declaration<SkPaint>();
    this.maskFilters = new Declaration<SkMaskFilter>();
    this.shaders = new Declaration<SkShader>();
    this.pathEffects = new Declaration<SkPathEffect>(peComp);
    this.imageFilters = new Declaration<SkImageFilter>(ifComp);
    this.colorFilters = new Declaration<SkColorFilter>(cfComp);
  }

  save() {
    this.paints.save();
    this.maskFilters.save();
    this.shaders.save();
    this.pathEffects.save();
    this.imageFilters.save();
    this.colorFilters.save();
  }

  restore() {
    this.paints.restore();
    this.maskFilters.restore();
    this.shaders.restore();
    this.pathEffects.restore();
    this.imageFilters.restore();
    this.colorFilters.restore();
  }
}
