const getInitials = (name: string) => {
  const parts = name.split(" ");
  const initials = parts.map((part) => part[0].toUpperCase()).join("");
  return initials;
};

const fromSnakeToCamelCase = (str: string) => {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace("-", "").replace("_", "")
  );
};

export const stringUtils = {
  getInitials,
  fromSnakeToCamelCase,
};
