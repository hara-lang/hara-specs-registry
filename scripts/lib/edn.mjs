class Reader {
  constructor(source) {
    this.source = source;
    this.index = 0;
  }

  fail(message) {
    throw new Error(`${message} at offset ${this.index}`);
  }

  skip() {
    while (this.index < this.source.length) {
      const char = this.source[this.index];
      if (/\s|,/.test(char)) {
        this.index += 1;
      } else if (char === ";") {
        while (this.index < this.source.length && this.source[this.index] !== "\n") this.index += 1;
      } else {
        break;
      }
    }
  }

  read() {
    this.skip();
    if (this.index >= this.source.length) this.fail("Unexpected end of EDN");
    const char = this.source[this.index];
    if (char === "{") return this.readMap();
    if (char === "[") return this.readSequential("]");
    if (char === "(") return this.readSequential(")");
    if (char === "#" && this.source[this.index + 1] === "{") {
      this.index += 1;
      return this.readSequential("}");
    }
    if (char === '"') return this.readString();
    return this.readAtom();
  }

  readMap() {
    this.index += 1;
    const output = Object.create(null);
    while (true) {
      this.skip();
      if (this.source[this.index] === "}") {
        this.index += 1;
        return output;
      }
      const key = this.read();
      this.skip();
      if (this.source[this.index] === "}") this.fail("Map key has no value");
      const value = this.read();
      const normalized = String(key).replace(/^:/, "");
      if (Object.hasOwn(output, normalized)) this.fail(`Duplicate map key ${normalized}`);
      output[normalized] = value;
    }
  }

  readSequential(end) {
    this.index += 1;
    const output = [];
    while (true) {
      this.skip();
      if (this.source[this.index] === end) {
        this.index += 1;
        return output;
      }
      output.push(this.read());
    }
  }

  readString() {
    this.index += 1;
    let output = "";
    while (this.index < this.source.length) {
      const char = this.source[this.index++];
      if (char === '"') return output;
      if (char !== "\\") {
        output += char;
        continue;
      }
      if (this.index >= this.source.length) this.fail("Truncated escape");
      const escaped = this.source[this.index++];
      const replacements = { n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\" };
      output += replacements[escaped] ?? escaped;
    }
    this.fail("Unterminated string");
  }

  readAtom() {
    const start = this.index;
    while (this.index < this.source.length && !/[\s,\[\]{}()]/.test(this.source[this.index])) this.index += 1;
    const token = this.source.slice(start, this.index);
    if (!token) this.fail("Expected EDN value");
    if (token === "nil") return null;
    if (token === "true") return true;
    if (token === "false") return false;
    if (/^[+-]?\d+(?:\.\d+)?$/.test(token)) return Number(token);
    return token;
  }
}

export function parseEdn(source) {
  const reader = new Reader(source);
  const value = reader.read();
  reader.skip();
  if (reader.index !== source.length) reader.fail("Trailing EDN input");
  return value;
}
