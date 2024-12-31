"worklet";

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

const createDeclaration = <T>(composer?: Composer<T>) => {
  const state = {
    decls: [] as T[],
    indexes: [0],
  };

  const getIndex = () => state.indexes[state.indexes.length - 1];

  return {
    save: () => {
      state.indexes.push(state.decls.length);
    },
    restore: () => {
      state.indexes.pop();
    },
    pop: () => state.decls.pop(),
    push: (decl: T) => {
      state.decls.push(decl);
    },
    popAll: () => {
      return state.decls.splice(getIndex(), state.decls.length - getIndex());
    },
    popAllAsOne: () => {
      if (state.decls.length === 0) {
        return undefined;
      }
      if (!composer) {
        throw new Error("No composer for this type of declaration");
      }
      const decls = state.decls.splice(
        getIndex(),
        state.decls.length - getIndex()
      );
      return composeDeclarations(decls, composer);
    },
  };
};

export const createDeclarationContext = (Skia: Skia) => {
  const peComp = Skia.PathEffect.MakeCompose.bind(Skia.PathEffect);
  const ifComp = Skia.ImageFilter.MakeCompose.bind(Skia.ImageFilter);
  const cfComp = Skia.ColorFilter.MakeCompose.bind(Skia.ColorFilter);

  const context = {
    Skia,
    paints: createDeclaration<SkPaint>(),
    maskFilters: createDeclaration<SkMaskFilter>(),
    shaders: createDeclaration<SkShader>(),
    pathEffects: createDeclaration<SkPathEffect>(peComp),
    imageFilters: createDeclaration<SkImageFilter>(ifComp),
    colorFilters: createDeclaration<SkColorFilter>(cfComp),
  };

  return {
    ...context,
    save: () => {
      context.paints.save();
      context.maskFilters.save();
      context.shaders.save();
      context.pathEffects.save();
      context.imageFilters.save();
      context.colorFilters.save();
    },
    restore: () => {
      context.paints.restore();
      context.maskFilters.restore();
      context.shaders.restore();
      context.pathEffects.restore();
      context.imageFilters.restore();
      context.colorFilters.restore();
    },
  };
};

export type DeclarationContext = ReturnType<typeof createDeclarationContext>;
