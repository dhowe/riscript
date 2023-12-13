/**
 * @memberof module:riscript
 */
class Util {
  
  ///////////////////////// CONSTANTS /////////////////////////

  
  /**
   * @static
   * @memberof Util
   * @package
   */
  static RegexEscape = '_RE_';

  ///////////////////////// FUNCTIONS /////////////////////////

  static escapeText(s, quotify) {
    if (typeof s !== 'string') return s;
    let t = s.replace(/\r?\n/g, '\\n');
    return quotify || !t.length ? "'" + t + "'" : t;
  }

  static stringHash(s) { // for testing
    let chr,
      hash = 0;
    for (let i = 0; i < s.length; i++) {
      chr = s.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    let strHash = hash.toString().padStart(9, '0');
    return hash < 0 ? strHash.replace('-', '0') : strHash;
  }

  static escapeMarkdownLink(txt) {
    let result = txt;
    let lookups = { '[': '&lsqb;', ']': '&rsqb;', '(': '&lpar;', ')': '&rpar;', '/': '&sol;' };
    Object.entries(lookups).forEach(([k, v]) => result = result.replace(new RegExp(`\\${k}`, 'g'), v));
    return result;
  }

  static slashEscapesToEntities(s) {
    s = Util.replaceAll(s, '\\(', '&lpar;');
    s = Util.replaceAll(s, '\\)', '&rpar;');
    s = Util.replaceAll(s, '\\[', '&lsqb;');
    s = Util.replaceAll(s, '\\]', '&rsqb;');
    s = Util.replaceAll(s, '\\{', '&lcqb;');
    s = Util.replaceAll(s, '\\}', '&rcqb;');
    s = Util.replaceAll(s, '\\@', '&commat;');
    s = Util.replaceAll(s, '\\#', '&num;');
    s = Util.replaceAll(s, '\\|', ' &vert');
    s = Util.replaceAll(s, '\\=', ' &equals');
    return s;
  }

  static escapeJSONRegex(text) {
    return text.replace(
      /\/([^/]+?)\/([igmsuy]*)/g,
      `"${Util.RegexEscape}$1${Util.RegexEscape}$2${Util.RegexEscape}"`
    );
  }

  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static replaceAll(str, match, replacement) {
    return str.replace(new RegExp(Util.escapeRegExp(match), 'g'), () => replacement);
  }

  static charCount(str, c) {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === c) count++;
    }
    return count;
  }
}

export { Util };