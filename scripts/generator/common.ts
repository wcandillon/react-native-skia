import _ from "lodash";

export const objectName = (name: string) => _.upperFirst(_.camelCase(name))