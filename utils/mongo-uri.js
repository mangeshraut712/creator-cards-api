function ensureDatabaseInMongoUri(uri, databaseName = 'creator-cards') {
  if (!uri || typeof uri !== 'string') {
    return uri;
  }

  const questionIndex = uri.indexOf('?');
  const beforeQuery = questionIndex === -1 ? uri : uri.slice(0, questionIndex);
  const query = questionIndex === -1 ? '' : uri.slice(questionIndex);
  const protocolIndex = beforeQuery.indexOf('://');

  if (protocolIndex === -1) {
    return uri;
  }

  const pathStart = beforeQuery.indexOf('/', protocolIndex + 3);

  if (pathStart === -1) {
    return `${beforeQuery}/${databaseName}${query}`;
  }

  const databasePath = beforeQuery.slice(pathStart + 1);

  if (!databasePath) {
    return `${beforeQuery}${databaseName}${query}`;
  }

  return uri;
}

module.exports = { ensureDatabaseInMongoUri };
