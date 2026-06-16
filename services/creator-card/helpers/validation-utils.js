function isAlphanumeric(value) {
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const isDigit = char >= '0' && char <= '9';
    const isLower = char >= 'a' && char <= 'z';
    const isUpper = char >= 'A' && char <= 'Z';

    if (!isDigit && !isLower && !isUpper) {
      return false;
    }
  }

  return true;
}

function isValidLinkUrl(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

module.exports = {
  isAlphanumeric,
  isValidLinkUrl,
};
