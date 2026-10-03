// Stub do body-parser para o Workers.
// O express importa body-parser só para reexportar express.json/urlencoded/raw/text;
// esses getters carregam raw-body → iconv-lite, cujos módulos de Node ficam
// desabilitados no bundle do Wrangler. Usamos parser próprio em index.js,
// então basta exportar fábricas de middleware neutras.
function bodyParserStub() {
  return function bodyParserStubMiddleware(req, res, next) {
    next();
  };
}

module.exports = bodyParserStub;
module.exports.json = bodyParserStub;
module.exports.raw = bodyParserStub;
module.exports.text = bodyParserStub;
module.exports.urlencoded = bodyParserStub;
