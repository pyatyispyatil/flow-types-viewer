export const cn = (...objs) => objs
  .filter(Boolean)
  .map((obj) => typeof obj !== 'string' ? (
    Object.entries(obj)
      .map(([key, value]) => value ? key : '')
      .filter(Boolean)
      .join(' ')
  ) : obj)
  .join(' ');
