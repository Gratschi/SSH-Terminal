type MultiRegexMatch = {
  match: string,
  start: number,
  end: number,
};

export default class MultiRegex {
  private readonly pattern: RegExp;

  constructor(pattern: RegExp | string) {
    this.pattern = new RegExp(pattern, "d");
  }

  public exec(str: string): MultiRegexMatch[] | undefined {
    const match = this.pattern.exec(str);

    if (match == null || match.indices == null) return;

    const strMatches = match.map(str => str);

    return match.indices.map(([start, end], i) => {
      return {
        match: strMatches[i],
        start: start,
        end: end,
      };
    });
  }
}
