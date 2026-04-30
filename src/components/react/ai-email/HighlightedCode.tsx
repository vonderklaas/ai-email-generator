type Token =
  | { type: "text"; value: string }
  | { type: "tag"; value: string }
  | { type: "attribute"; value: string }
  | { type: "string"; value: string }
  | { type: "comment"; value: string };

function tokenizeTag(tag: string): Token[] {
  const tokens: Token[] = [];
  const tagMatch = tag.match(/^<\/?[\w:-]+/);
  if (!tagMatch) return [{ type: "tag", value: tag }];

  tokens.push({ type: "tag", value: tagMatch[0] });
  const rest = tag.slice(tagMatch[0].length);
  const attrPattern = /(\s+)([\w:-]+)(=)("[^"]*"|'[^']*'|[^\s"'=<>`]+)?/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(rest))) {
    if (match.index > lastIndex) {
      tokens.push({ type: "tag", value: rest.slice(lastIndex, match.index) });
    }
    tokens.push({ type: "text", value: match[1]! });
    tokens.push({ type: "attribute", value: match[2]! });
    tokens.push({ type: "tag", value: match[3]! });
    if (match[4]) tokens.push({ type: "string", value: match[4] });
    lastIndex = attrPattern.lastIndex;
  }

  if (lastIndex < rest.length) {
    tokens.push({ type: "tag", value: rest.slice(lastIndex) });
  }

  return tokens;
}

function tokenizeXmlLike(source: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /(<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: source.slice(lastIndex, match.index) });
    }
    const value = match[0]!;
    if (value.startsWith("<!--")) {
      tokens.push({ type: "comment", value });
    } else {
      tokens.push(...tokenizeTag(value));
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < source.length) {
    tokens.push({ type: "text", value: source.slice(lastIndex) });
  }

  return tokens;
}

const tokenClass: Record<Token["type"], string> = {
  text: "text-slate-100",
  tag: "text-sky-300",
  attribute: "text-amber-200",
  string: "text-emerald-300",
  comment: "text-slate-500",
};

type Props = {
  code: string;
};

export function HighlightedCode({ code }: Props) {
  return (
    <>
      {tokenizeXmlLike(code).map((token, index) => (
        <span key={`${token.type}-${index}`} className={tokenClass[token.type]}>
          {token.value}
        </span>
      ))}
    </>
  );
}

